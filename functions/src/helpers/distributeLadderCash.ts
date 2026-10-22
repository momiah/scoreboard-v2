import type { Ladder } from "courtchamps-shared/types";
import type { LadderPlayoffPayout } from "courtchamps-shared/helpers";

/**
 * Stub: pays the cash share of a paid ladder's prize to each winner and adds
 * it to their lifetime `profileDetail.cashWon`, which drives PROLevel. Paid
 * ladders and payments are not built yet, so this only logs what would be paid.
 *
 * TODO(paid ladders): transfer `payout.prize.cash` through the payment
 * provider, split equally between the players of a doubles side, and
 * increment each player's `profileDetail.cashWon` by their share inside the
 * payout transaction.
 */
export const distributeLadderCash = async ({
  ladder,
  payouts,
}: {
  ladder: Pick<Ladder, "ladderId" | "currencyType">;
  payouts: LadderPlayoffPayout[];
}): Promise<void> => {
  payouts
    .filter((payout) => payout.prize.cash > 0)
    .forEach((payout) => {
      console.log(
        `💸 Cash payout stub: ladder ${ladder.ladderId} would pay ${payout.prize.cash} ${ladder.currencyType ?? "GBP"} to ${payout.playerIds.join(", ")} for place ${payout.place}.`,
      );
    });
};
