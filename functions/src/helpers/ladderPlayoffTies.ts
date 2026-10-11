import * as admin from "firebase-admin";

import {
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_PLAYOFF_TIES_COLLECTION,
} from "courtchamps-shared/types";
import type {
  GameTeam,
  Ladder,
  LadderMatch,
  LadderPlayoffTie,
  LadderPlayoffTieOutcome,
  LadderPlayoffTieSide,
} from "courtchamps-shared/types";
import {
  advanceLadderPlayoffBracket,
  buildLadderPlayoffLegMatch,
  decideLadderPlayoffTie,
  decideLadderPlayoffTieAtDeadline,
  getDueLadderPlayoffReminderDays,
  getLadderPlayoffLegHost,
  roundLabel,
} from "courtchamps-shared/helpers";

import { notifyLadderPlayers } from "./notifyLadderPlayers";

type Db = admin.firestore.Firestore;

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const PLAYOFFS_TAB = "Playoffs";

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
};

export const toLadderPlayoffTie = (
  id: string,
  data: admin.firestore.DocumentData,
): LadderPlayoffTie => ({
  ...(data as LadderPlayoffTie),
  tieId: id,
  createdAt: toDate(data.createdAt) ?? new Date(0),
  scheduledAt: toDate(data.scheduledAt),
  deadlineAt: toDate(data.deadlineAt),
  completedAt: toDate(data.completedAt),
  coinToss: data.coinToss
    ? { ...data.coinToss, flippedAt: toDate(data.coinToss.flippedAt) ?? new Date(0) }
    : null,
});

const tiePlayerIds = (tie: Pick<LadderPlayoffTie, "side1" | "side2">): string[] => [
  ...(tie.side1?.playerIds ?? []),
  ...(tie.side2?.playerIds ?? []),
];

export const ladderPlayoffTeamName = (team: GameTeam): string =>
  [team.player1, team.player2]
    .filter(Boolean)
    .map((player) => player?.displayName || player?.firstName || player?.username)
    .filter(Boolean)
    .join(" & ") || "TBD";

const totalRoundsOf = (ties: LadderPlayoffTie[]): number =>
  Math.max(...ties.filter((tie) => !tie.isThirdPlacePlayoff).map((tie) => tie.round));

export const ladderPlayoffRoundName = (
  tie: Pick<LadderPlayoffTie, "round" | "isThirdPlacePlayoff">,
  totalRounds: number,
): string =>
  tie.isThirdPlacePlayoff
    ? "3rd-place game"
    : roundLabel(2 ** (totalRounds - tie.round + 1));

export interface LadderPlayoffTieResolution {
  tie: LadderPlayoffTie;
  ties: LadderPlayoffTie[];
  changed: LadderPlayoffTie[];
  deciderCreated: boolean;
}

/**
 * Settles a scheduled tie inside a transaction. When both matches are complete
 * the winner goes through; if the aggregate is level a one-game decider is
 * created at match 2's court (already checked in). With `atDeadline`, a tie
 * past its deadline is decided on what was played (void if nothing). Returns
 * null when there is nothing to do, so re-runs are harmless.
 */
export const resolveLadderPlayoffTie = async ({
  db,
  ladderId,
  tieId,
  now,
  atDeadline = false,
}: {
  db: Db;
  ladderId: string;
  tieId: string;
  now: Date;
  atDeadline?: boolean;
}): Promise<LadderPlayoffTieResolution | null> => {
  const ladderRef = db.collection(LADDERS).doc(ladderId);
  const tiesRef = ladderRef.collection(LADDER_PLAYOFF_TIES_COLLECTION);
  const legsQuery = ladderRef
    .collection(LADDER_MATCHES)
    .where("playoffTieId", "==", tieId);

  return db.runTransaction(async (transaction) => {
    const [tiesSnapshot, legsSnapshot] = await Promise.all([
      transaction.get(tiesRef),
      transaction.get(legsQuery),
    ]);
    const ties = tiesSnapshot.docs.map((tieDoc) =>
      toLadderPlayoffTie(tieDoc.id, tieDoc.data()),
    );
    const tie = ties.find((candidate) => candidate.tieId === tieId);
    if (!tie || tie.status !== LADDER_PLAYOFF_TIE_STATUS.SCHEDULED) return null;
    const legs = legsSnapshot.docs.map((legDoc) => legDoc.data() as LadderMatch);

    const settle = (
      winner: LadderPlayoffTieSide | null,
      outcome: LadderPlayoffTieOutcome,
    ): LadderPlayoffTieResolution => {
      const changed = advanceLadderPlayoffBracket({ ties, tieId, winner, outcome, now });
      changed.forEach((changedTie) =>
        transaction.set(tiesRef.doc(changedTie.tieId), changedTie, { merge: true }),
      );
      return { tie, ties, changed, deciderCreated: false };
    };

    if (atDeadline) {
      if (!tie.deadlineAt || now.getTime() < tie.deadlineAt.getTime()) return null;
      const { winner, outcome } = decideLadderPlayoffTieAtDeadline(tie, legs);
      return settle(winner, outcome);
    }

    const decision = decideLadderPlayoffTie(tie, legs);
    if (decision.decided) {
      return settle(decision.winner, LADDER_PLAYOFF_TIE_OUTCOME.PLAYED);
    }

    const secondMatch = legs.find((leg) => leg.playoffLeg === 2);
    const hasDecider = legs.some((leg) => leg.playoffLeg === 3);
    if (!decision.deciderRequired || hasDecider || !secondMatch || !tie.coinToss) {
      return null;
    }

    const deciderRef = ladderRef.collection(LADDER_MATCHES).doc();
    const decider = buildLadderPlayoffLegMatch({
      tie,
      leg: 3,
      host: getLadderPlayoffLegHost(tie.coinToss, 3),
      ladderMatchId: deciderRef.id,
      ladderType: secondMatch.ladderType ?? "Singles",
      input: {
        court: secondMatch.court,
        matchDate: secondMatch.matchDate,
        matchTime: secondMatch.matchTime,
        currencyType: secondMatch.currencyType,
        shuttleType: secondMatch.shuttleType,
      },
      createdBy: "system",
      now,
      accepted: true,
    });
    transaction.set(deciderRef, {
      ...decider,
      ...(secondMatch.checkIn ? { checkIn: secondMatch.checkIn } : {}),
      lastUpdated: now,
    });
    transaction.update(tiesRef.doc(tieId), { deciderRequired: true });
    return { tie, ties, changed: [], deciderCreated: true };
  });
};

/** Tells players what a resolution means for them: decider, void, or next round. */
export const notifyLadderPlayoffResolution = async ({
  ladder,
  resolution,
}: {
  ladder: Pick<Ladder, "ladderId" | "name">;
  resolution: LadderPlayoffTieResolution;
}): Promise<void> => {
  const totalRounds = totalRoundsOf(resolution.ties);
  const { tie } = resolution;
  const roundName = ladderPlayoffRoundName(tie, totalRounds);

  if (resolution.deciderCreated) {
    await notifyLadderPlayers({
      userIds: tiePlayerIds(tie),
      ladder,
      kind: `playoff-decider-${tie.tieId}`,
      title: "One deciding game to play",
      message: `Your ${roundName} in ${ladder.name} is level on aggregate. One deciding game must be played to decide who goes through.`,
      tab: PLAYOFFS_TAB,
      data: { tieId: tie.tieId },
    });
    return;
  }

  for (const changedTie of resolution.changed) {
    const changedName = ladderPlayoffRoundName(changedTie, totalRounds);
    if (
      changedTie.status === LADDER_PLAYOFF_TIE_STATUS.COMPLETED &&
      changedTie.outcome === LADDER_PLAYOFF_TIE_OUTCOME.VOID &&
      changedTie.tieId === tie.tieId
    ) {
      await notifyLadderPlayers({
        userIds: tiePlayerIds(tie),
        ladder,
        kind: `playoff-void-${changedTie.tieId}`,
        title: "Playoff game not played",
        message: `Your ${changedName} in ${ladder.name} wasn't played before the deadline, so neither side goes through.`,
        tab: PLAYOFFS_TAB,
        data: { tieId: changedTie.tieId },
      });
    }
    if (changedTie.status === LADDER_PLAYOFF_TIE_STATUS.SCHEDULED) {
      await notifyLadderPlayers({
        userIds: tiePlayerIds(changedTie),
        ladder,
        kind: `playoff-round-${changedTie.tieId}`,
        title: `You've reached the ${changedName}`,
        message: `Congratulations! You've reached the ${changedName} in ${ladder.name}. You have ${LADDER_PLAYOFF_TIE_DAYS} days to play both your home and away games.`,
        tab: PLAYOFFS_TAB,
        data: { tieId: changedTie.tieId },
      });
    }
  }
};

/** Day 3, 6 and 9 reminders for every scheduled tie in a ladder, once each. */
export const sendDueLadderPlayoffReminders = async ({
  db,
  ladder,
  ties,
  now,
}: {
  db: Db;
  ladder: Pick<Ladder, "ladderId" | "name">;
  ties: LadderPlayoffTie[];
  now: Date;
}): Promise<number> => {
  const tiesRef = db
    .collection(LADDERS)
    .doc(ladder.ladderId)
    .collection(LADDER_PLAYOFF_TIES_COLLECTION);
  const totalRounds = totalRoundsOf(ties);
  let sent = 0;

  for (const tie of ties) {
    if (getDueLadderPlayoffReminderDays(tie, now).length === 0) continue;
    const dueDays = await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(tiesRef.doc(tie.tieId));
      if (!fresh.exists) return [];
      const due = getDueLadderPlayoffReminderDays(
        toLadderPlayoffTie(fresh.id, fresh.data() as admin.firestore.DocumentData),
        now,
      );
      if (due.length > 0) {
        transaction.update(tiesRef.doc(tie.tieId), {
          remindersSentDays: admin.firestore.FieldValue.arrayUnion(...due),
        });
      }
      return due;
    });
    const latestDay = Math.max(...dueDays);
    if (!Number.isFinite(latestDay)) continue;
    const daysLeft = LADDER_PLAYOFF_TIE_DAYS - latestDay;
    await notifyLadderPlayers({
      userIds: tiePlayerIds(tie),
      ladder,
      kind: `playoff-reminder-${tie.tieId}-day${latestDay}`,
      title: "Playoff reminder",
      message: `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left to finish your ${ladderPlayoffRoundName(tie, totalRounds)} in ${ladder.name}.`,
      tab: PLAYOFFS_TAB,
      data: { tieId: tie.tieId },
    });
    sent += 1;
  }
  return sent;
};
