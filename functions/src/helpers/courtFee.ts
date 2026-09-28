import type { LadderMatch } from "courtchamps-shared/types";

/** How a ladder match ended, which decides how its court fee is settled. */
export type LadderMatchOutcomeKind =
  | "completed" // played out (approve / auto-approve / dispute resolution)
  | "cancelled" // a player cancelled it from match settings
  | "expired" // no activity for the expire window — nobody played it out
  | "walkover"; // no-show — completed with match.walkover set

/**
 * STUB: reconcile a ladder match's court fee when the match reaches a terminal
 * state. Called once, from the onLadderMatchStatusChange trigger, for every
 * terminal transition. Not yet implemented — this is where the payment provider
 * settlement will be wired when payments are built.
 *
 * ── Fee model ──
 * The poster (`createdBy`) books and pays the venue up front. The accepter
 * (`acceptedBy`) pays their share into escrow via the platform, and the
 * platform fee is deducted from that amount. Settlement is therefore one of two
 * directions on the accepter's held share: RELEASE it to the poster, or REFUND
 * it to the accepter. Only settle when `courtFee > 0`.
 *
 * ── Settlement per outcome ──
 * • completed  → RELEASE the accepter's share to the poster (the court was
 *                used); the platform keeps its fee. No refund.
 * • walkover   → the only conditional case; settle by who showed up
 *                (`walkoverWinner` is the side that showed):
 *                  – accepter no-showed (poster won the walkover) → RELEASE to
 *                    the poster, as `completed`; the no-show accepter forfeits.
 *                  – poster no-showed (accepter won the walkover) → REFUND the
 *                    accepter in full incl. the platform fee (no service given);
 *                    the poster bears their own venue cost.
 * • cancelled  → REFUND the accepter's share (a player called it off before any
 *                game was played). Platform-fee policy TBD — likely refunded;
 *                revisit if a cancellation window/penalty is added.
 * • expired    → REFUND the accepter's share in full (the court went unused);
 *                the poster reclaims their venue booking from the venue direct.
 *
 * ── Notes for the real implementation ──
 * • Idempotency: this trigger can re-fire on retries, so persist a settlement
 *   marker (e.g. `feeSettledAt`) and no-op if already settled — never
 *   double-refund or double-release.
 * • Platform fee: kept on a RELEASE; refunded on a full REFUND (per policy).
 */
export const reconcileLadderCourtFee = (
  match: Pick<
    LadderMatch,
    | "ladderMatchId"
    | "courtFee"
    | "currencyType"
    | "createdBy"
    | "acceptedBy"
    | "walkoverWinner"
    | "participants"
  >,
  outcome: LadderMatchOutcomeKind,
): Promise<void> => {
  // STUB: court-fee settlement is not built yet (see the doc comment above for
  // the per-outcome logic). Wire the payment provider here when payments land.
  void match;
  void outcome;
  return Promise.resolve();
};
