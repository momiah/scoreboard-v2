import type { Ladder } from "courtchamps-shared/types";

/**
 * Stub: refunds every paid entrant of a ladder the platform cancelled (the
 * backend or an admin) their full entry fee, platform fee included. Refunds a
 * user causes keep the platform fee. Payments are not wired up yet, so this
 * only logs what would be refunded.
 */
export const refundLadderEntryFees = async ({
  ladder,
  entrantCount,
}: {
  ladder: Pick<Ladder, "ladderId" | "entryFee" | "currencyType">;
  entrantCount: number;
}): Promise<void> => {
  if (!ladder.entryFee || ladder.entryFee <= 0 || entrantCount <= 0) return;
  console.log(
    `💸 Refund stub: ladder ${ladder.ladderId} would refund ${entrantCount} entrant(s) ${ladder.entryFee} ${ladder.currencyType} each (full fee, platform fee included).`,
  );
};
