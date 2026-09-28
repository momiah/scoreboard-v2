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
 * ── Charge-at-accept model (money is taken up front, refunded if not played) ──
 * The accepter's share is charged the moment they accept, NOT near the start.
 * This keeps the poster safe: a match only becomes `accepted` once the payment
 * has actually succeeded, so there is never an accepted-but-unpaid match and the
 * poster is never left one day out with a booked court and a failed opponent
 * card. It also removes the ~7-day card-authorisation window entirely — the
 * money is already collected, so any booking horizon works — matches can be
 * scheduled right up to the ladder's playoff start with no payment-window
 * constraint.
 *   1. On accept → an off-session PaymentIntent charges the accepter's share
 *      plus the platform fee and settles into escrow (a Stripe Connect balance /
 *      held funds). If the charge fails, the accept is rejected and the match
 *      stays open for someone else — nothing is committed on a failed card.
 *   2. On terminal → this function either RELEASES the court-fee share to the
 *      poster (completed / accepter no-show walkover) or REFUNDS it to the
 *      accepter (cancelled / expired / poster no-show walkover). The 10%
 *      platform fee is NON-REFUNDABLE in every case and is retained by the
 *      platform — see the notes below.
 *
 * ── Platform fee (our revenue) and refunds ──
 * The platform fee is 10% of the court fee, added on top (a £10 court fee → a
 * £1 platform fee). It is charged at accept and kept whatever the outcome, so
 * on a refund only the court-fee share is returned; the 10% stays. Across the
 * £5–£20 court-fee range that non-refundable 10% (£0.50–£2.00) comfortably
 * covers Stripe's per-refund/processing cost (~£0.20 fixed + the small
 * percentage that Stripe does not return on a refund), so a cancelled or
 * expired match is never a loss — it retains a margin. Because refunds do cost
 * the platform something, the non-refundable-fee terms must be stated clearly:
 * in the ladder T&Cs (LadderTermsContent) and in the AddLadderMatchModal
 * disclaimer ("A 10% non refundable platform fee is deducted from this fee").
 * WATCH the fixed per-transaction fee on tiny fees only if the £5 floor is ever
 * lowered — at £5 the 10% is £0.50, already above the fixed cost.
 *
 * ── Fee model ──
 * The poster (`createdBy`) books and pays the venue up front. The accepter
 * (`acceptedBy`) covers their share (plus the platform fee) via the platform,
 * charged at accept. Settlement is one of two directions on the escrowed funds:
 * RELEASE the court-fee share to the poster, or REFUND it to the accepter (the
 * platform fee is kept either way). Only settle when `courtFee > 0`.
 *
 * ── Settlement per outcome ──
 * • completed  → RELEASE the court-fee share to the poster (the court was used);
 *                the platform keeps its fee.
 * • walkover   → the only conditional case; settle by who showed up
 *                (`walkoverWinner` is the side that showed):
 *                  – accepter no-showed (poster won the walkover) → RELEASE to
 *                    the poster, as `completed`; the accepter forfeits.
 *                  – poster no-showed (accepter won the walkover) → REFUND the
 *                    court-fee share to the accepter; the poster bears their own
 *                    venue cost. Platform fee still kept.
 * • cancelled  → REFUND the court-fee share to the accepter (called off before
 *                any game); platform fee kept. Revisit if a cancellation
 *                window/penalty is added.
 * • expired    → REFUND the court-fee share to the accepter (the court went
 *                unused); the poster reclaims their venue booking from the
 *                venue. Platform fee kept.
 *
 * ── Notes for the real implementation ──
 * • Idempotency: this trigger can re-fire on retries, so persist a settlement
 *   marker (e.g. `feeSettledAt`) and no-op if already settled — never
 *   double-release or double-refund.
 * • A failed payout to the poster does not reverse the accepter's charge; the
 *   money stays in escrow and the payout is retried.
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
