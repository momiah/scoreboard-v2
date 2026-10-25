import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

import {
  LADDER_PRIZE_PAYOUTS_COLLECTION,
  LADDER_PRIZE_PAYOUT_STATUS,
  LADDER_PRIZE_REVIEW_DECISION,
} from "courtchamps-shared/types";
import type {
  Ladder,
  LadderPrizeAmount,
  LadderPrizePayout,
  LadderPrizePayoutStatus,
} from "courtchamps-shared/types";
import { formatLadderPrizeWon, ordinalPlace } from "courtchamps-shared/helpers";

import { buildPrizeAwardUpdate } from "./helpers/prizeAwards";
import { notifyLadderPlayers } from "./helpers/notifyLadderPlayers";
import { payHeldLadderPrize } from "./helpers/payHeldLadderPrize";

type Db = admin.firestore.Firestore;

const NOTHING: LadderPrizeAmount = { cash: 0, cp: 0 };

const clamp = (amount: LadderPrizeAmount | undefined, prize: LadderPrizeAmount): LadderPrizeAmount => ({
  cash: Math.min(Math.max(0, amount?.cash ?? 0), prize.cash),
  cp: Math.floor(Math.min(Math.max(0, amount?.cp ?? 0), prize.cp)),
});

/**
 * Carries out an admin's decision on a held ladder prize: pay it in full, pay
 * part of it, or withhold it. Whatever is not paid is retained by Court Champs.
 * Runs once per decision; a re-run finds it applied and does nothing.
 */
export const applyLadderPrizeReview = async ({
  db,
  ladderId,
  payoutId,
  now,
}: {
  db: Db;
  ladderId: string;
  payoutId: string;
  now: Date;
}): Promise<LadderPrizePayout | null> => {
  const ladderRef = db.collection("ladders").doc(ladderId);
  const payoutRef = ladderRef.collection(LADDER_PRIZE_PAYOUTS_COLLECTION).doc(payoutId);
  const applied = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(payoutRef);
    const payout = snapshot.data() as LadderPrizePayout | undefined;
    if (!payout || payout.status !== LADDER_PRIZE_PAYOUT_STATUS.HELD) return null;
    const review = payout.review;
    if (!review || review.appliedAt) return null;
    const userRef = db.collection("users").doc(payout.userId);
    const profile = await transaction.get(userRef);

    const paid = !profile.exists
      ? NOTHING
      : review.decision === LADDER_PRIZE_REVIEW_DECISION.PAY
        ? payout.prize
        : review.decision === LADDER_PRIZE_REVIEW_DECISION.PAY_PART
          ? clamp(review.amount, payout.prize)
          : NOTHING;
    const status: LadderPrizePayoutStatus = !profile.exists
      ? LADDER_PRIZE_PAYOUT_STATUS.KEPT
      : review.decision === LADDER_PRIZE_REVIEW_DECISION.PAY
        ? LADDER_PRIZE_PAYOUT_STATUS.PAID
        : review.decision === LADDER_PRIZE_REVIEW_DECISION.PAY_PART
          ? LADDER_PRIZE_PAYOUT_STATUS.PART_PAID
          : LADDER_PRIZE_PAYOUT_STATUS.WITHHELD;

    if (status === LADDER_PRIZE_PAYOUT_STATUS.PAID || status === LADDER_PRIZE_PAYOUT_STATUS.PART_PAID) {
      transaction.update(
        userRef,
        buildPrizeAwardUpdate({ cp: paid.cp, statsField: "ladderStats", place: payout.place }),
      );
    }
    const updated: LadderPrizePayout = {
      ...payout,
      paid,
      status,
      review: { ...review, appliedAt: now },
      updatedAt: now,
    };
    transaction.update(payoutRef, {
      paid,
      status,
      "review.appliedAt": now,
      updatedAt: now,
    });
    return updated;
  });
  if (!applied) return null;

  await payHeldLadderPrize({ payout: applied, cash: applied.paid.cash });
  if (applied.status === LADDER_PRIZE_PAYOUT_STATUS.KEPT) return applied;
  const ladder = (await ladderRef.get()).data() as Ladder | undefined;
  const name = ladder?.name ?? "the ladder";
  const format = (amount: LadderPrizeAmount) =>
    formatLadderPrizeWon(amount, applied.currencyType) ?? "nothing";
  const place = `${applied.voided ? "joint " : ""}${ordinalPlace(applied.place)} place`;
  const reason = applied.review?.reason ? ` Reason: ${applied.review.reason}` : "";
  const message =
    applied.status === LADDER_PRIZE_PAYOUT_STATUS.PAID
      ? `After review, you've been paid your full prize of ${format(applied.paid)} for ${place} in ${name}.${reason}`
      : applied.status === LADDER_PRIZE_PAYOUT_STATUS.PART_PAID
        ? `After review, you've been paid ${format(applied.paid)} of your ${format(applied.prize)} prize for ${place} in ${name}.${reason}`
        : `After review, your ${format(applied.prize)} prize for ${place} in ${name} won't be paid.${reason}`;
  await notifyLadderPlayers({
    userIds: [applied.userId],
    ladder: { ladderId },
    kind: "playoff-prize-review",
    title: "Your prize review is complete",
    message,
    tab: "Summary",
    data: { payoutId },
  });
  return applied;
};

export const onLadderPrizePayoutReviewed = onDocumentUpdated(
  `ladders/{ladderId}/${LADDER_PRIZE_PAYOUTS_COLLECTION}/{payoutId}`,
  async (event) => {
    const after = event.data?.after.data() as LadderPrizePayout | undefined;
    if (!after?.review || after.review.appliedAt || after.status !== LADDER_PRIZE_PAYOUT_STATUS.HELD) return;
    try {
      await applyLadderPrizeReview({
        db: admin.firestore(),
        ladderId: event.params.ladderId,
        payoutId: event.params.payoutId,
        now: new Date(),
      });
    } catch (error) {
      console.error(
        `[prizes] could not apply the review of ${event.params.ladderId}/${event.params.payoutId}:`,
        error,
      );
    }
  },
);
