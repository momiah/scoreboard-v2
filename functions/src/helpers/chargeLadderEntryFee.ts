import { TERMS_VERSION } from "courtchamps-shared";
import { getLadderEntryPrice } from "courtchamps-shared/helpers";
import type { Ladder } from "courtchamps-shared/types";

export interface LadderEntryCharge {
  charged: boolean;
  amount: number;
  termsVersion: string;
  termsAcceptedAt: Date | null;
}

/**
 * Stub: charges a player (or a doubles team, once) the entry fee plus the
 * platform fee on top when they join a paid ladder. Not wired: joining is free
 * until paid ladders are built, and today the app writes the join itself.
 *
 * TODO(paid ladders): call this from a callable join function on the server,
 * never from the device. Create the ladderParticipants (or ladderTeams) entry
 * only once the charge succeeds, so there is never a joined-but-unpaid player;
 * a failed card leaves them unregistered. The entry fee goes into the prize
 * pool and the platform fee is retained by Court Champs (see PAYMENTS.md).
 * Store termsVersion and termsAcceptedAt on the entry record with the charge
 * (docs/payments-dispute-readiness.md).
 */
export const chargeLadderEntryFee = async ({
  ladder,
  userId,
  termsAcceptedAt = null,
}: {
  ladder: Pick<Ladder, "ladderId" | "entryFee" | "currencyType">;
  userId: string;
  termsAcceptedAt?: Date | null;
}): Promise<LadderEntryCharge> => {
  const terms = { termsVersion: TERMS_VERSION, termsAcceptedAt };
  if (!ladder.entryFee || ladder.entryFee <= 0) return { charged: false, amount: 0, ...terms };
  const { total } = getLadderEntryPrice(ladder.entryFee);
  console.log(
    `💳 Entry fee stub: ladder ${ladder.ladderId} would charge ${userId} ${total} ${ladder.currencyType ?? "GBP"} (entry fee plus platform fee).`,
  );
  return { charged: false, amount: total, ...terms };
};
