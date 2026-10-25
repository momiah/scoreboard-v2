import type { Ladder } from "courtchamps-shared/types";

export interface LadderCashPayment {
  payoutId: string;
  userId: string;
  /** This player's cash, after the doubles split and the Unclaimed Prize Pot share. */
  cash: number;
}

/**
 * Stub: pays each player the cash part of their ladder prize. Paid ladders and
 * payments are not built yet, so this only logs what would be paid.
 *
 * TODO(paid ladders): transfer each `payment.cash` to the player through the
 * payment provider (idempotent on `payoutId`, so a retried run never pays
 * twice), then increment their `profileDetail.cashWon` by the same amount.
 * Amounts arrive final: split for doubles, Unclaimed Prize Pot share included,
 * held and retained prizes already left out.
 */
export const distributeLadderCash = async ({
  ladder,
  payments,
}: {
  ladder: Pick<Ladder, "ladderId" | "currencyType">;
  payments: LadderCashPayment[];
}): Promise<void> => {
  payments.forEach((payment) => {
    console.log(
      `💸 Cash payout stub: ladder ${ladder.ladderId} would pay ${payment.cash} ${ladder.currencyType ?? "GBP"} to ${payment.userId} (${payment.payoutId}).`,
    );
  });
};
