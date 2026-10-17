import * as admin from "firebase-admin";

import {
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
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
  formatLadderPrizeWon,
  getLadderPlacePrize,
  getLadderOpponentIds,
  getLadderPlayoffLegHost,
  getLadderTieFinishPlaces,
  ordinalPlace,
  roundLabel,
} from "courtchamps-shared/helpers";
import type { PrizeLadder } from "courtchamps-shared/helpers";

import { notifyLadderPlayers } from "./notifyLadderPlayers";

type Db = admin.firestore.Firestore;

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const PLAYOFFS_TAB = "Playoffs";
const SUMMARY_TAB = "Summary";

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
});

const tiePlayerIds = (tie: Pick<LadderPlayoffTie, "side1" | "side2">): string[] => [
  ...(tie.side1?.playerIds ?? []),
  ...(tie.side2?.playerIds ?? []),
];

const TIE_SIDES = ["side1", "side2"] as const;
type TieSideKey = (typeof TIE_SIDES)[number];

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
    ? "3rd-place tie"
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
 * created at the court of whichever match was played last (already checked
 * in). With `atDeadline`, a tie past its deadline is decided on what was
 * played (void if nothing). Returns null when there is nothing to do, so
 * re-runs are harmless.
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

    const secondMatch = legs
      .filter((leg) => leg.playoffLeg === 1 || leg.playoffLeg === 2)
      .sort(
        (a, b) =>
          (toDate(b.completedAt)?.getTime() ?? 0) - (toDate(a.completedAt)?.getTime() ?? 0),
      )[0];
    const hasDecider = legs.some((leg) => leg.playoffLeg === 3);
    if (!decision.deciderRequired || hasDecider || !secondMatch) {
      return null;
    }

    const deciderRef = ladderRef.collection(LADDER_MATCHES).doc();
    const deciderHost = getLadderPlayoffLegHost(tie, 3);
    const hostSide = deciderHost === "team1" ? tie.side1 : tie.side2;
    const awaySide = deciderHost === "team1" ? tie.side2 : tie.side1;
    const decider = buildLadderPlayoffLegMatch({
      tie,
      leg: 3,
      host: deciderHost,
      ladderMatchId: deciderRef.id,
      ladderType: secondMatch.ladderType ?? "Singles",
      input: {
        court: secondMatch.court,
        matchDate: secondMatch.matchDate,
        matchTime: secondMatch.matchTime,
        currencyType: secondMatch.currencyType,
        shuttleType: secondMatch.shuttleType,
      },
      createdBy: hostSide?.playerIds[0] ?? secondMatch.createdBy,
      now,
      accepted: true,
    });
    transaction.set(deciderRef, {
      ...decider,
      ...(awaySide?.playerIds[0] ? { acceptedBy: awaySide.playerIds[0] } : {}),
      ...(secondMatch.checkIn ? { checkIn: secondMatch.checkIn } : {}),
      lastUpdated: now,
    });
    transaction.update(tiesRef.doc(tieId), { deciderRequired: true });
    return { tie, ties, changed: [], deciderCreated: true };
  });
};

/** Tells players what a resolution means for them: decider, void, or next round. */
export type PlayoffLadder = Pick<Ladder, "ladderId" | "name"> &
  Partial<PrizeLadder & Pick<Ladder, "currencyType">>;

const prizeWon = (ladder: PlayoffLadder, place: number): string | null =>
  formatLadderPrizeWon(
    getLadderPlacePrize(ladder as PrizeLadder, place),
    ladder.currencyType ?? "GBP",
  );

const notifyTieFinish = async ({
  ladder,
  tie,
  totalRounds,
  ties,
}: {
  ladder: PlayoffLadder;
  tie: LadderPlayoffTie;
  totalRounds: number;
  ties: LadderPlayoffTie[];
}): Promise<void> => {
  const winnerKey: TieSideKey = tie.winner === "team1" ? "side1" : "side2";
  const loserKey: TieSideKey = winnerKey === "side1" ? "side2" : "side1";
  const places = getLadderTieFinishPlaces(tie, totalRounds);
  const placed = async (key: TieSideKey, place: number) => {
    const won = prizeWon(ladder, place);
    await notifyLadderPlayers({
      userIds: tie[key]?.playerIds ?? [],
      ladder,
      kind: `playoff-finish-${tie.tieId}`,
      title: `You placed ${ordinalPlace(place)}`,
      message: `Congratulations, you have placed ${ordinalPlace(place)} in ${ladder.name}${won ? ` and been awarded ${won}` : ""}.`,
      tab: SUMMARY_TAB,
      data: { tieId: tie.tieId },
    });
  };

  if (places.winner !== null) {
    await placed(winnerKey, places.winner);
    await placed(loserKey, places.loser);
    return;
  }
  const loserPlaysForThird =
    tie.round === totalRounds - 1 && ties.some((other) => other.isThirdPlacePlayoff);
  if (loserPlaysForThird || !tie[loserKey]) return;
  const roundName = ladderPlayoffRoundName(tie, totalRounds);
  const won = prizeWon(ladder, places.loser);
  await notifyLadderPlayers({
    userIds: tie[loserKey]?.playerIds ?? [],
    ladder,
    kind: `playoff-out-${tie.tieId}`,
    title: `Knocked out in the ${roundName}`,
    message: `You've been knocked out in the ${roundName} of ${ladder.name}.${won ? ` You've been awarded ${won}, paid when the playoffs finish.` : ""}`,
    tab: PLAYOFFS_TAB,
    data: { tieId: tie.tieId },
  });
};

/**
 * Marks the ladder complete once the Final and the 3rd-place tie are both
 * finished. Paying the prizes is Phase 3; until then it's only logged.
 */
export const completeLadderPlayoffsIfFinished = async ({
  db,
  ladderId,
  resolution,
  now,
}: {
  db: Db;
  ladderId: string;
  resolution: LadderPlayoffTieResolution;
  now: Date;
}): Promise<boolean> => {
  const latest = new Map(resolution.ties.map((tie) => [tie.tieId, tie]));
  resolution.changed.forEach((tie) => latest.set(tie.tieId, tie));
  const ties = [...latest.values()];
  const totalRounds = totalRoundsOf(ties);
  const deciding = ties.filter(
    (tie) => tie.isThirdPlacePlayoff || tie.round >= totalRounds,
  );
  if (!deciding.every((tie) => tie.status === LADDER_PLAYOFF_TIE_STATUS.COMPLETED)) {
    return false;
  }
  const ladderRef = db.collection(LADDERS).doc(ladderId);
  const completed = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ladderRef);
    if (fresh.data()?.status !== LADDER_STATUS.PLAYOFFS) return false;
    transaction.update(ladderRef, {
      status: LADDER_STATUS.COMPLETED,
      playoffsCompletedAt: now,
    });
    return true;
  });
  if (completed) {
    console.log(
      `🏆 [playoffs] ${ladderId} complete — prize payouts are Phase 3 and haven't been made.`,
    );
  }
  return completed;
};

export const notifyLadderPlayoffResolution = async ({
  ladder,
  resolution,
}: {
  ladder: PlayoffLadder;
  resolution: LadderPlayoffTieResolution;
}): Promise<void> => {
  const totalRounds = totalRoundsOf(resolution.ties);
  const { tie } = resolution;
  const roundName = ladderPlayoffRoundName(tie, totalRounds);
  const before = new Map(resolution.ties.map((original) => [original.tieId, original]));

  if (resolution.deciderCreated) {
    await notifyLadderPlayers({
      userIds: tiePlayerIds(tie),
      ladder,
      kind: `playoff-decider-${tie.tieId}`,
      title: "You have a deciding game left to play",
      message: `You have a deciding game left to play as your matches in the ${roundName} of ${ladder.name} resulted in a draw!`,
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
        title: "Playoff tie not played",
        message: `Your ${changedName} in ${ladder.name} wasn't played before the deadline, so neither side goes through.`,
        tab: PLAYOFFS_TAB,
        data: { tieId: changedTie.tieId },
      });
    }
    if (
      changedTie.status === LADDER_PLAYOFF_TIE_STATUS.COMPLETED &&
      changedTie.winner &&
      before.get(changedTie.tieId)?.status !== LADDER_PLAYOFF_TIE_STATUS.COMPLETED
    ) {
      await notifyTieFinish({ ladder, tie: changedTie, totalRounds, ties: resolution.ties });
    }
    const previous = before.get(changedTie.tieId);
    const arrived = TIE_SIDES.filter((key) => changedTie[key] && !previous?.[key]);
    const waiting = TIE_SIDES.filter((key) => changedTie[key] && previous?.[key]);
    const playersOf = (keys: TieSideKey[]) =>
      keys.flatMap((key) => changedTie[key]?.playerIds ?? []);

    if (
      changedTie.status === LADDER_PLAYOFF_TIE_STATUS.AWAITING_ENTRANTS &&
      arrived.length > 0
    ) {
      await notifyLadderPlayers({
        userIds: playersOf(arrived),
        ladder,
        kind: `playoff-through-${changedTie.tieId}`,
        ...(changedTie.isThirdPlacePlayoff
          ? {
              title: "You'll play for 3rd place",
              message: `Your Semi-Final in ${ladder.name} is over, and you'll play for 3rd place. We'll let you know as soon as your opponent is decided.`,
            }
          : {
              title: `Congratulations, you're through to the ${changedName}!`,
              message: `You're through to the ${changedName} in ${ladder.name}! We'll let you know as soon as your opponent is decided.`,
            }),
        tab: PLAYOFFS_TAB,
        data: { tieId: changedTie.tieId },
      });
    }
    if (changedTie.status === LADDER_PLAYOFF_TIE_STATUS.SCHEDULED) {
      const opponentOf = (key: TieSideKey) =>
        ladderPlayoffTeamName(key === "side1" ? changedTie.team2 : changedTie.team1);
      for (const key of arrived) {
        await notifyLadderPlayers({
          userIds: changedTie[key]?.playerIds ?? [],
          ladder,
          kind: `playoff-round-${changedTie.tieId}`,
          ...(changedTie.isThirdPlacePlayoff
            ? {
                title: "You'll play for 3rd place",
                message: `You'll play for 3rd place - You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`,
              }
            : {
                title: `Congratulations, you're through to the ${changedName}!`,
                message: `Your ${changedName} against ${opponentOf(key)} is ready! You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`,
              }),
          tab: PLAYOFFS_TAB,
          data: { tieId: changedTie.tieId },
        });
      }
      for (const key of waiting) {
        await notifyLadderPlayers({
          userIds: changedTie[key]?.playerIds ?? [],
          ladder,
          kind: `playoff-opponent-${changedTie.tieId}`,
          title: `Your ${changedName} is ready`,
          message: `Your ${changedName} against ${opponentOf(key)} is ready! You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`,
          tab: PLAYOFFS_TAB,
          data: { tieId: changedTie.tieId },
        });
      }
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

/** A posted playoff match the away side hasn't answered in this long is accepted for them. */
export const LADDER_PLAYOFF_AUTO_ACCEPT_MS = 24 * 60 * 60 * 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const matchSlot = (match: Pick<LadderMatch, "matchDate" | "matchTime">): string => {
  const [day, month] = String(match.matchDate).split("-").map(Number);
  const date = Number.isFinite(day) && MONTHS[month - 1] ? `${day} ${MONTHS[month - 1]}` : match.matchDate;
  return match.matchTime?.start ? `${date}, ${match.matchTime.start}` : date;
};

const isAutoAcceptDue = (match: LadderMatch, now: Date): boolean => {
  const createdAt = toDate(match.createdAt);
  return (
    !!match.playoffTieId &&
    !match.playNow &&
    match.matchStatus === LADDER_MATCH_STATUS.POSTED &&
    !!createdAt &&
    now.getTime() - createdAt.getTime() >= LADDER_PLAYOFF_AUTO_ACCEPT_MS
  );
};

/**
 * Accepts every playoff match the away side hasn't answered within 24 hours of
 * it being arranged, and tells both sides. A "play now" offer is never
 * accepted for anyone. Returns the ids of the matches it accepted.
 */
export const autoAcceptDueLadderPlayoffMatches = async ({
  db,
  ladder,
  now,
}: {
  db: Db;
  ladder: Pick<Ladder, "ladderId" | "name">;
  now: Date;
}): Promise<string[]> => {
  const ladderRef = db.collection(LADDERS).doc(ladder.ladderId);
  const posted = await ladderRef
    .collection(LADDER_MATCHES)
    .where("matchStatus", "==", LADDER_MATCH_STATUS.POSTED)
    .get();
  const accepted: string[] = [];

  for (const matchDoc of posted.docs) {
    if (!isAutoAcceptDue(matchDoc.data() as LadderMatch, now)) continue;
    const result = await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(matchDoc.ref);
      const match = fresh.data() as LadderMatch | undefined;
      if (!match || !isAutoAcceptDue(match, now)) return null;
      const tie = await transaction.get(
        ladderRef.collection(LADDER_PLAYOFF_TIES_COLLECTION).doc(match.playoffTieId as string),
      );
      if (tie.data()?.status !== LADDER_PLAYOFF_TIE_STATUS.SCHEDULED) return null;
      const awayIds = getLadderOpponentIds(match, match.createdBy);
      transaction.update(matchDoc.ref, {
        matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
        acceptedBy: awayIds[0],
        acceptedAt: now,
        autoAccepted: true,
        lastUpdated: now,
      });
      return { match, awayIds };
    });
    if (!result) continue;
    const { match, awayIds } = result;
    const hostIds = match.participants.filter((id) => !awayIds.includes(id));
    const where = `playoff match ${match.playoffLeg} at ${match.court?.courtName ?? "the court"}, ${matchSlot(match)}`;
    await notifyLadderPlayers({
      userIds: awayIds,
      ladder,
      kind: `playoff-auto-accepted-${matchDoc.id}`,
      title: "Playoff match accepted",
      message: `You didn't reply within 24 hours, so ${where} has been accepted for you.`,
      tab: PLAYOFFS_TAB,
      data: { tieId: match.playoffTieId },
    });
    await notifyLadderPlayers({
      userIds: hostIds,
      ladder,
      kind: `playoff-auto-accept-host-${matchDoc.id}`,
      title: "Playoff match accepted",
      message: `Your opponent didn't reply within 24 hours, so ${where} has been accepted for them.`,
      tab: PLAYOFFS_TAB,
      data: { tieId: match.playoffTieId },
    });
    accepted.push(matchDoc.id);
  }
  return accepted;
};
