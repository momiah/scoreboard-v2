import type { LadderMatch } from "courtchamps-shared/types";

/** How a ladder match ended, which decides how its court fee is settled. */
export type LadderMatchOutcomeKind =
  | "completed" // played out (or auto-approved / void) — fee settles as normal
  | "cancelled" // never started — refund the accepter's share, no penalty
  | "expired" // started then abandoned — the court was used, fee stands
  | "walkover"; // no-show — the absent player bears it, the attendee is reimbursed

/**
 * STUB: reconcile a ladder match's court fee when the match reaches a terminal
 * state. Not yet implemented — this is where the payment provider settlement
 * (release / refund / charge) will be wired.
 *
 * Fee model: the poster (`createdBy`) books and pays the venue; the accepter
 * (`acceptedBy`) pays their share to the poster, minus the platform fee. When a
 * match does not play out normally the player who made the effort must not be
 * left out of pocket, so each outcome settles differently:
 *   - completed → release the held fee to the poster; nothing to refund.
 *   - cancelled → refund the accepter's share (nobody played, no penalty).
 *   - expired   → fee stands (the court was used); consider a partial refund.
 *   - walkover  → charge the no-show player, reimburse the one who showed.
 *
 * A no-op for now so callers can wire the call sites ahead of the settlement.
 */
export const reconcileLadderCourtFee = (
  match: Pick<
    LadderMatch,
    | "ladderMatchId"
    | "courtFee"
    | "currencyType"
    | "createdBy"
    | "acceptedBy"
    | "participants"
  >,
  outcome: LadderMatchOutcomeKind,
): void => {
  // STUB: court-fee settlement is not built yet.
  void match;
  void outcome;
};
