import type { LadderPrizePayout } from "courtchamps-shared/types";

/**
 * Stub: pays the cash an admin released from a held ladder prize. Paid ladders
 * and payments are not built yet, so this only logs what would be paid.
 *
 * TODO(paid ladders): transfer `cash` to `payout.userId` through the payment
 * provider (idempotent on `payout.payoutId`), then increment their
 * `profileDetail.cashWon` by the same amount.
 */
export const payHeldLadderPrize = async ({
  payout,
  cash,
}: {
  payout: Pick<LadderPrizePayout, "payoutId" | "ladderId" | "userId" | "currencyType">;
  cash: number;
}): Promise<void> => {
  if (cash <= 0) return;
  console.log(
    `💸 Held prize stub: ladder ${payout.ladderId} would pay ${cash} ${payout.currencyType} to ${payout.userId} after review (${payout.payoutId}).`,
  );
};
