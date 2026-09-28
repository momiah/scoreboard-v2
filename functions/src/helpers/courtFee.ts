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
 * ── Capture model (only ever charge on capture) ──
 * The accepter's payment is AUTHORISED (held), not charged, when they accept
 * the match; it is only CAPTURED here, once the match hits a terminal status.
 * Stripe charges its processing fee only on capture, so voiding a hold
 * (cancelled / expired / poster no-show) costs nothing — the accepter is not
 * charged and we pay no fee.
 *   Fitting the ~7-day card-authorisation window: matches must start within
 *   MAX_SCHEDULE_DAYS_AHEAD (4) days of being posted (enforced in
 *   AddLadderMatchModal), so accept → start ≤ 4 days and an untouched match
 *   expires by ~7 days. Because the 72h expire clock resets on activity and the
 *   time-of-day can nudge that past 7 days, the settlement MUST capture on a
 *   hard safety deadline (e.g. accept + 6 days) if the match is still not
 *   terminal, so the authorisation never lapses. That safety capture is the
 *   only case that pays a fee on a not-yet-completed match, and it is rare.
 *
 * ── Platform fee (our revenue) ──
 * The platform fee is 10% of the court fee, added on top (a £10 court fee → a
 * £1 platform fee). That fee pays the Stripe processing fee and CourtChamps
 * keeps the difference. WATCH the fixed per-transaction fee (~£0.20 UK / $0.30
 * US): a flat 10% does not cover it on small court fees (~£2 loses money), so
 * floor the platform fee at a minimum (e.g. max(10%, £0.50)). International /
 * Amex cards and Stripe Connect payout fees cost more — size the fee for those.
 *
 * ── Fee model ──
 * The poster (`createdBy`) books and pays the venue up front. The accepter
 * (`acceptedBy`) covers their share (plus the platform fee) via the platform.
 * Settlement is one of two directions on the accepter's held authorisation:
 * CAPTURE it (release to the poster), or VOID it (accepter pays nothing). Only
 * settle when `courtFee > 0`.
 *
 * ── Settlement per outcome ──
 * • completed  → CAPTURE and release to the poster (the court was used); the
 *                platform keeps its fee.
 * • walkover   → the only conditional case; settle by who showed up
 *                (`walkoverWinner` is the side that showed):
 *                  – accepter no-showed (poster won the walkover) → CAPTURE and
 *                    release to the poster, as `completed`; the accepter forfeits.
 *                  – poster no-showed (accepter won the walkover) → VOID the
 *                    hold; the accepter pays nothing, the poster bears their own
 *                    venue cost.
 * • cancelled  → VOID the hold — the accepter pays nothing (called off before
 *                any game). Revisit if a cancellation window/penalty is added.
 * • expired    → VOID the hold — the accepter pays nothing (the court went
 *                unused); the poster reclaims their venue booking from the venue.
 *
 * ── Notes for the real implementation ──
 * • Idempotency: this trigger can re-fire on retries, so persist a settlement
 *   marker (e.g. `feeSettledAt`) and no-op if already settled — never
 *   double-capture or double-void.
 * • A failed payout to the poster does not reverse the accepter's capture; the
 *   money is held and the payout retried.
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
