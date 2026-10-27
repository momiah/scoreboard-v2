import * as admin from "firebase-admin";

import {
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_PLAYOFF_TIES_COLLECTION,
  LADDER_PLAYOFF_WALKOVER_REASON,
  LADDER_REPORT_COUNTS_COLLECTION,
  DISQUALIFICATION_REASON_LABELS,
  LADDER_PRIZE_PAYOUTS_COLLECTION,
  LADDER_PRIZE_PAYOUT_STATUS,
  LADDER_PRIZE_POT_NAME,
} from "courtchamps-shared/types";
import type {
  GameTeam,
  Ladder,
  LadderMatch,
  LadderPlayoffTie,
  LadderPlayoffTieOutcome,
  LadderPlayoffTieSide,
  LadderPlayoffWalkoverReason,
  LadderPrizeAmount,
  LadderPrizePayout,
  StrikeCounts,
} from "courtchamps-shared/types";
import {
  advanceLadderPlayoffBracket,
  buildLadderPlayoffLegMatch,
  decideLadderPlayoffTie,
  decideLadderPlayoffTieAtDeadline,
  getDueLadderPlayoffReminderDays,
  formatLadderPrizeWon,
  formatLadderSidePrize,
  getDisqualification,
  getLadderPlacePrize,
  LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS,
  getLadderOpponentIds,
  isDisqualified,
  isLadderPlayoffHostArrangeOverdue,
  isLadderPlayoffMatchAutoAcceptDue,
  getLadderPlayoffLegHost,
  planLadderPlayoffPrizes,
  getLadderPlayoffTotalRounds,
  getLadderTiePlacings,
  ordinalPlace,
  roundLabel,
} from "courtchamps-shared/helpers";
import type { PrizeLadder } from "courtchamps-shared/helpers";

import { notifyLadderPlayers } from "./notifyLadderPlayers";
import { buildPrizeAwardUpdate } from "./prizeAwards";
import { distributeLadderCash } from "./distributeLadderCash";

type Db = admin.firestore.Firestore;

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const USERS = "users";
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

const totalRoundsOf = getLadderPlayoffTotalRounds;

const isLadderPlayoffFinished = (ties: LadderPlayoffTie[]): boolean => {
  if (ties.length === 0) return false;
  const totalRounds = totalRoundsOf(ties);
  return ties
    .filter((tie) => tie.isThirdPlacePlayoff || tie.round >= totalRounds)
    .every((tie) => tie.status === LADDER_PLAYOFF_TIE_STATUS.COMPLETED);
};

const latestTiesOf = (resolution: LadderPlayoffTieResolution): LadderPlayoffTie[] => {
  const latest = new Map(resolution.ties.map((tie) => [tie.tieId, tie]));
  resolution.changed.forEach((tie) => latest.set(tie.tieId, tie));
  return [...latest.values()];
};

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
  forced,
}: {
  db: Db;
  ladderId: string;
  tieId: string;
  now: Date;
  atDeadline?: boolean;
  /** A result decided outside the matches, e.g. an opponent's disqualification. */
  forced?: {
    winner: LadderPlayoffTieSide | null;
    outcome: LadderPlayoffTieOutcome;
    reason?: LadderPlayoffWalkoverReason;
  };
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
      reason?: LadderPlayoffWalkoverReason,
    ): LadderPlayoffTieResolution => {
      const changed = advanceLadderPlayoffBracket({
        ties,
        tieId,
        winner,
        outcome,
        now,
      }).map((changedTie) =>
        changedTie.tieId === tieId && reason
          ? { ...changedTie, walkoverReason: reason }
          : changedTie,
      );
      changed.forEach((changedTie) =>
        transaction.set(tiesRef.doc(changedTie.tieId), changedTie, { merge: true }),
      );
      return { tie, ties, changed, deciderCreated: false };
    };

    if (forced) return settle(forced.winner, forced.outcome, forced.reason);

    if (atDeadline) {
      if (!tie.deadlineAt || now.getTime() < tie.deadlineAt.getTime()) return null;
      const { winner, outcome } = decideLadderPlayoffTieAtDeadline(tie, legs);
      return settle(
        winner,
        outcome,
        outcome === LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER
          ? LADDER_PLAYOFF_WALKOVER_REASON.INACTIVE_OPPONENT
          : undefined,
      );
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

const sidePrizeWon = (ladder: PlayoffLadder, place: number, players: number): string | null =>
  formatLadderSidePrize(
    getLadderPlacePrize(ladder as PrizeLadder, place),
    players,
    ladder.currencyType ?? "GBP",
  );

const KNOCKED_OUT_BECAUSE: Record<string, string> = {
  [LADDER_PLAYOFF_WALKOVER_REASON.INACTIVE_OPPONENT]:
    "you didn't arrange or play a match before the deadline",
  [LADDER_PLAYOFF_WALKOVER_REASON.DISQUALIFIED_OPPONENT]:
    "you've been disqualified from the ladder",
};

const WALKOVER_NOTE: Record<string, string> = {
  [LADDER_PLAYOFF_WALKOVER_REASON.INACTIVE_OPPONENT]:
    "Your opponent didn't arrange or play a match, so you go through on a walkover.",
  [LADDER_PLAYOFF_WALKOVER_REASON.DISQUALIFIED_OPPONENT]:
    "Your opponent was disqualified from the ladder, so you go through on a walkover.",
};

const notifyTieFinish = async ({
  ladder,
  tie,
  totalRounds,
  ties,
  playoffsFinished,
}: {
  ladder: PlayoffLadder;
  tie: LadderPlayoffTie;
  totalRounds: number;
  ties: LadderPlayoffTie[];
  playoffsFinished: boolean;
}): Promise<void> => {
  const roundName = ladderPlayoffRoundName(tie, totalRounds);
  const paidWhen = playoffsFinished ? "" : ", paid when the playoffs finish";
  for (const placing of getLadderTiePlacings(tie, ties)) {
    if (placing.voided) continue;
    const won = placing.disqualified
      ? null
      : sidePrizeWon(ladder, placing.place, placing.playerIds.length);
    if (placing.decidesMedal && !placing.disqualified) {
      await notifyLadderPlayers({
        userIds: placing.playerIds,
        ladder,
        kind: `playoff-finish-${tie.tieId}`,
        title: `You placed ${ordinalPlace(placing.place)}`,
        message: `Congratulations, you have placed ${ordinalPlace(placing.place)} in ${ladder.name}${won ? ` and been awarded ${won}${paidWhen}` : ""}.`,
        tab: SUMMARY_TAB,
        data: { tieId: tie.tieId },
      });
      continue;
    }
    const because = KNOCKED_OUT_BECAUSE[tie.walkoverReason ?? ""];
    await notifyLadderPlayers({
      userIds: placing.playerIds,
      ladder,
      kind: `playoff-out-${tie.tieId}`,
      title: `Knocked out in the ${roundName}`,
      message: `You've been knocked out in the ${roundName} of ${ladder.name}${because ? ` because ${because}` : ""}.${won ? ` You've been awarded ${won}${paidWhen}.` : ""}`,
      tab: PLAYOFFS_TAB,
      data: { tieId: tie.tieId },
    });
  }
};

export interface LadderCompletion {
  completed: boolean;
  paid: boolean;
  payouts: LadderPrizePayout[];
}

const disqualifiedReason = (strikes: StrikeCounts | undefined): string => {
  const { primaryReason } = getDisqualification(strikes);
  return primaryReason
    ? `Disqualified: ${strikes?.[primaryReason] ?? 0} ${DISQUALIFICATION_REASON_LABELS[primaryReason]}`
    : "Disqualified from the ladder";
};

const formatPrize = (prize: LadderPrizeAmount, currencyType: string): string =>
  formatLadderPrizeWon(prize, currencyType) ?? "nothing";

const notifyLadderPrizes = async ({
  ladder,
  payouts,
  ties,
}: {
  ladder: PlayoffLadder;
  payouts: LadderPrizePayout[];
  ties: LadderPlayoffTie[];
}): Promise<void> => {
  const totalRounds = totalRoundsOf(ties);
  const tiesById = new Map(ties.map((tie) => [tie.tieId, tie]));
  for (const payout of payouts) {
    const currency = payout.currencyType;
    const place = `${payout.voided ? "joint " : ""}${ordinalPlace(payout.place)}`;
    const base = { userIds: [payout.userId], ladder, kind: "playoff-prize", tab: SUMMARY_TAB, data: { payoutId: payout.payoutId } };
    if (payout.status === LADDER_PRIZE_PAYOUT_STATUS.HELD) {
      await notifyLadderPlayers({
        ...base,
        title: "Your prize is under review",
        message: `Your prize for ${place} place in ${ladder.name} (${formatPrize(payout.prize, currency)}) is under review because you were disqualified from the ladder. We'll let you know the outcome.`,
      });
      continue;
    }
    if (payout.status !== LADDER_PRIZE_PAYOUT_STATUS.PAID) continue;
    const tie = tiesById.get(payout.tieId);
    if (payout.voided && tie) {
      await notifyLadderPlayers({
        ...base,
        title: "Your playoff prize",
        message: `Your ${ladderPlayoffRoundName(tie, totalRounds)} in ${ladder.name} wasn't played, so you finish ${place} and have been awarded ${formatPrize(payout.prize, currency)}.`,
      });
      continue;
    }
    if (payout.potShare.cash > 0 || payout.potShare.cp > 0) {
      await notifyLadderPlayers({
        ...base,
        title: "Extra prize money",
        message: `You've been awarded ${formatPrize(payout.potShare, currency)} from ${ladder.name}'s ${LADDER_PRIZE_POT_NAME}: prize money from playoff ties that weren't played.`,
      });
    }
  }
};

/**
 * In one transaction: marks the ladder Completed once the Final and the
 * 3rd-place tie are both finished, pays every placed player their prize and
 * writes a prize payout record for each, the `prizesDistributed` claim
 * committing with them. A retried or concurrent run finds the claim and pays
 * nothing. A disqualified player's prize is held for review; a deleted
 * account's is retained by Court Champs.
 */
export const completeAndPayLadder = async ({
  db,
  ladderId,
  now,
}: {
  db: Db;
  ladderId: string;
  now: Date;
}): Promise<LadderCompletion> => {
  const ladderRef = db.collection(LADDERS).doc(ladderId);
  const payoutsRef = ladderRef.collection(LADDER_PRIZE_PAYOUTS_COLLECTION);
  const nothing: LadderCompletion = { completed: false, paid: false, payouts: [] };
  const result = await db.runTransaction(async (transaction) => {
    const [ladderSnapshot, tiesSnapshot] = await Promise.all([
      transaction.get(ladderRef),
      transaction.get(ladderRef.collection(LADDER_PLAYOFF_TIES_COLLECTION)),
    ]);
    const ladder = ladderSnapshot.data() as Ladder | undefined;
    if (!ladder) return nothing;
    const completing = ladder.status === LADDER_STATUS.PLAYOFFS;
    const paying = !ladder.prizesDistributed;
    if (!completing && !(paying && ladder.status === LADDER_STATUS.COMPLETED)) return nothing;
    const ties = tiesSnapshot.docs.map((tieDoc) => toLadderPlayoffTie(tieDoc.id, tieDoc.data()));
    if (!isLadderPlayoffFinished(ties)) return nothing;

    const userIds = paying
      ? [...new Set(ties.flatMap((tie) => getLadderTiePlacings(tie, ties)).flatMap((placing) => placing.playerIds))]
      : [];
    const [profiles, counts] = userIds.length
      ? await Promise.all([
          transaction.getAll(...userIds.map((userId) => db.collection(USERS).doc(userId))),
          transaction.getAll(
            ...userIds.map((userId) =>
              ladderRef.collection(LADDER_REPORT_COUNTS_COLLECTION).doc(userId),
            ),
          ),
        ])
      : [[], []];
    const existing = new Set(profiles.filter((profile) => profile.exists).map((profile) => profile.id));
    const strikesOf = new Map(
      counts.map((count) => [count.id, count.data()?.strikes as StrikeCounts | undefined]),
    );
    const plan = paying
      ? planLadderPlayoffPrizes(
          ladder,
          ties,
          userIds.filter((userId) => isDisqualified(strikesOf.get(userId))),
        )
      : null;
    const currencyType = ladder.currencyType ?? "GBP";

    const payouts = (plan?.payouts ?? []).flatMap((side) =>
      side.playerIds.map((userId): LadderPrizePayout => {
        const status = !existing.has(userId)
          ? LADDER_PRIZE_PAYOUT_STATUS.KEPT
          : side.disqualified
            ? LADDER_PRIZE_PAYOUT_STATUS.HELD
            : LADDER_PRIZE_PAYOUT_STATUS.PAID;
        const { placePrize, potShare, prize } = side.perPlayer;
        return {
          payoutId: `${side.tieId}-${userId}`,
          ladderId,
          userId,
          sidePlayerIds: side.playerIds,
          tieId: side.tieId,
          place: side.place,
          voided: side.voided,
          currencyType,
          placePrize,
          potShare,
          prize,
          paid: status === LADDER_PRIZE_PAYOUT_STATUS.PAID ? prize : { cash: 0, cp: 0 },
          status,
          reason:
            status === LADDER_PRIZE_PAYOUT_STATUS.KEPT
              ? "Account deleted before payout"
              : status === LADDER_PRIZE_PAYOUT_STATUS.HELD
                ? disqualifiedReason(strikesOf.get(userId))
                : null,
          review: null,
          createdAt: now,
          updatedAt: now,
        };
      }),
    );

    payouts.forEach((payout) => {
      transaction.set(payoutsRef.doc(payout.payoutId), payout);
      if (payout.status !== LADDER_PRIZE_PAYOUT_STATUS.PAID) return;
      transaction.update(
        db.collection(USERS).doc(payout.userId),
        buildPrizeAwardUpdate({ cp: payout.paid.cp, statsField: "ladderStats", place: payout.place }),
      );
    });
    transaction.update(ladderRef, {
      ...(completing
        ? { status: LADDER_STATUS.COMPLETED, playoffsCompletedAt: now }
        : {}),
      ...(plan
        ? {
            prizesDistributed: true,
            prizeDistributionDate: admin.firestore.FieldValue.serverTimestamp(),
            unclaimedPrizePot: plan.unclaimed,
            retainedPrizeMoney: plan.kept,
          }
        : {}),
    });
    return { completed: completing, paid: paying, payouts, ladder, ties };
  });
  if (!("ladder" in result)) return result;
  const { ladder, ties, ...completion } = result;
  if (completion.payouts.length) {
    await distributeLadderCash({
      ladder: { ...ladder, ladderId },
      payments: completion.payouts
        .filter((payout) => payout.status === LADDER_PRIZE_PAYOUT_STATUS.PAID && payout.paid.cash > 0)
        .map((payout) => ({ payoutId: payout.payoutId, userId: payout.userId, cash: payout.paid.cash })),
    });
    await notifyLadderPrizes({ ladder: { ...ladder, ladderId }, payouts: completion.payouts, ties });
    console.log(
      `🏆 [playoffs] ${ladderId} prizes: ${completion.payouts
        .map((payout) => `${payout.userId} ${ordinalPlace(payout.place)} ${payout.prize.cp} CP ${payout.status}`)
        .join(", ")}`,
    );
  }
  return completion;
};

/** Completes and pays the ladder once a resolution finishes its playoffs. */
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
  if (!isLadderPlayoffFinished(latestTiesOf(resolution))) return false;
  const { completed } = await completeAndPayLadder({ db, ladderId, now });
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
  const resolved = resolution.changed.find((changedTie) => changedTie.tieId === tie.tieId);
  const walkoverNote = WALKOVER_NOTE[resolved?.walkoverReason ?? ""];
  const playoffsFinished = isLadderPlayoffFinished(latestTiesOf(resolution));
  const withNote = (message: string) => (walkoverNote ? `${message} ${walkoverNote}` : message);

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
      await notifyTieFinish({
        ladder,
        tie: changedTie,
        totalRounds,
        ties: resolution.ties,
        playoffsFinished,
      });
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
              message: withNote(
                `You're through to the ${changedName} in ${ladder.name}! We'll let you know as soon as your opponent is decided.`,
              ),
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
                message: `Your Semi-Final in ${ladder.name} is over, and you'll play for 3rd place against ${opponentOf(key)}. You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`,
              }
            : {
                title: `Congratulations, you're through to the ${changedName}!`,
                message: withNote(
                  `Congratulations! You've made it to the ${changedName} in ${ladder.name}. You have ${LADDER_PLAYOFF_TIE_DAYS} days to play your matches.`,
                ),
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
          title: `Your ${changedName} opponent is decided`,
          message: changedTie.isThirdPlacePlayoff
            ? `Your Semi-Final in ${ladder.name} is over, and your 3rd-place tie against ${opponentOf(key)} is ready! You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`
            : `Your ${changedName} against ${opponentOf(key)} is ready! You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`,
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const matchSlot = (match: Pick<LadderMatch, "matchDate" | "matchTime">): string => {
  const [day, month] = String(match.matchDate).split("-").map(Number);
  const date = Number.isFinite(day) && MONTHS[month - 1] ? `${day} ${MONTHS[month - 1]}` : match.matchDate;
  return match.matchTime?.start ? `${date}, ${match.matchTime.start}` : date;
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
    if (!isLadderPlayoffMatchAutoAcceptDue(matchDoc.data() as LadderMatch, now)) continue;
    const result = await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(matchDoc.ref);
      const match = fresh.data() as LadderMatch | undefined;
      if (!match || !isLadderPlayoffMatchAutoAcceptDue(match, now)) return null;
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
      message: `You didn't reply within ${LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS} hours, so ${where} has been accepted for you.`,
      tab: PLAYOFFS_TAB,
      data: { tieId: match.playoffTieId },
    });
    await notifyLadderPlayers({
      userIds: hostIds,
      ladder,
      kind: `playoff-auto-accept-host-${matchDoc.id}`,
      title: "Playoff match accepted",
      message: `Your opponent didn't reply within ${LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS} hours, so ${where} has been accepted for them.`,
      tab: PLAYOFFS_TAB,
      data: { tieId: match.playoffTieId },
    });
    accepted.push(matchDoc.id);
  }
  return accepted;
};

const sideDisqualified = async (
  ladderRef: admin.firestore.DocumentReference,
  playerIds: string[],
): Promise<boolean> => {
  const counts = await Promise.all(
    playerIds.map((userId) =>
      ladderRef.collection(LADDER_REPORT_COUNTS_COLLECTION).doc(userId).get(),
    ),
  );
  return counts.some((snap) =>
    isDisqualified(snap.data()?.strikes as StrikeCounts | undefined),
  );
};

/**
 * A side with a disqualified player can no longer play: the other side goes
 * through on a walkover at once, or nobody does if both are out. Returns the
 * ids of the ties it settled.
 */
export const settleDisqualifiedLadderPlayoffTies = async ({
  db,
  ladder,
  ties,
  now,
}: {
  db: Db;
  ladder: PlayoffLadder;
  ties: LadderPlayoffTie[];
  now: Date;
}): Promise<string[]> => {
  const ladderRef = db.collection(LADDERS).doc(ladder.ladderId);
  const settled: string[] = [];
  for (const tie of ties) {
    if (tie.status !== LADDER_PLAYOFF_TIE_STATUS.SCHEDULED || !tie.side1 || !tie.side2) continue;
    const [out1, out2] = await Promise.all([
      sideDisqualified(ladderRef, tie.side1.playerIds),
      sideDisqualified(ladderRef, tie.side2.playerIds),
    ]);
    if (!out1 && !out2) continue;
    const resolution = await resolveLadderPlayoffTie({
      db,
      ladderId: ladder.ladderId,
      tieId: tie.tieId,
      now,
      forced:
        out1 && out2
          ? { winner: null, outcome: LADDER_PLAYOFF_TIE_OUTCOME.VOID }
          : {
              winner: out1 ? "team2" : "team1",
              outcome: LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER,
              reason: LADDER_PLAYOFF_WALKOVER_REASON.DISQUALIFIED_OPPONENT,
            },
    });
    if (!resolution) continue;
    await notifyLadderPlayoffResolution({ ladder, resolution });
    await completeLadderPlayoffsIfFinished({ db, ladderId: ladder.ladderId, resolution, now });
    settled.push(tie.tieId);
  }
  return settled;
};

/**
 * Once a tie has gone 48 hours without match 1 being arranged, tells both
 * sides that the other may now arrange without waiting. One notice per tie.
 */
export const sendLadderPlayoffHostOverdueNotices = async ({
  db,
  ladder,
  ties,
  now,
}: {
  db: Db;
  ladder: PlayoffLadder;
  ties: LadderPlayoffTie[];
  now: Date;
}): Promise<number> => {
  const ladderRef = db.collection(LADDERS).doc(ladder.ladderId);
  let sent = 0;
  for (const tie of ties) {
    if (tie.hostOverdueNoticeSentAt || !tie.side1 || !tie.side2) continue;
    if (!isLadderPlayoffHostArrangeOverdue(tie, now)) continue;
    const legs = await ladderRef
      .collection(LADDER_MATCHES)
      .where("playoffTieId", "==", tie.tieId)
      .get();
    const arranged = legs.docs.some((leg) => {
      const match = leg.data() as LadderMatch;
      return match.playoffLeg === 1 && match.matchStatus !== LADDER_MATCH_STATUS.CANCELLED;
    });
    if (arranged) continue;
    const marked = await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(ladderRef.collection(LADDER_PLAYOFF_TIES_COLLECTION).doc(tie.tieId));
      if (!fresh.exists || fresh.data()?.hostOverdueNoticeSentAt) return false;
      transaction.update(fresh.ref, { hostOverdueNoticeSentAt: now });
      return true;
    });
    if (!marked) continue;
    const hostKey: TieSideKey = getLadderPlayoffLegHost(tie, 1) === "team1" ? "side1" : "side2";
    const waitingKey: TieSideKey = hostKey === "side1" ? "side2" : "side1";
    const nameOf = (key: TieSideKey) =>
      ladderPlayoffTeamName(key === "side1" ? tie.team1 : tie.team2);
    await notifyLadderPlayers({
      userIds: tie[waitingKey]?.playerIds ?? [],
      ladder,
      kind: `playoff-host-overdue-waiting-${tie.tieId}`,
      title: "You can arrange your match now",
      message: `${nameOf(hostKey)} hasn't arranged match 1, so you can now arrange your home match without waiting.`,
      tab: PLAYOFFS_TAB,
      data: { tieId: tie.tieId },
    });
    await notifyLadderPlayers({
      userIds: tie[hostKey]?.playerIds ?? [],
      ladder,
      kind: `playoff-host-overdue-host-${tie.tieId}`,
      title: "Arrange match 1",
      message: `You haven't arranged match 1 in ${ladder.name} yet. ${nameOf(waitingKey)} can now arrange their home match without waiting for you.`,
      tab: PLAYOFFS_TAB,
      data: { tieId: tie.tieId },
    });
    sent += 1;
  }
  return sent;
};
