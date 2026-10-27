# Ladder court-fee payments

How a ladder match's **court fee** is collected, held, and settled. This is the
single source of truth for the payment model; the code that will implement it
lives in `functions/src/helpers/courtFee.ts` (`reconcileLadderCourtFee`, still a
documented stub) and is triggered from
`functions/src/onLadderMatchStatusChange.ts`.

Nothing here is charged yet — payments are not wired. This documents the agreed
design so the stub can be built without re-deriving it.

## Roles

- **Poster** (`match.createdBy`) — books and pays the venue up front, out of
  band. CourtChamps does not touch the venue booking.
- **Accepter** (`match.acceptedBy`) — pays their **share** of the court fee,
  plus the platform fee, through CourtChamps.

## The two fees

| Fee | Who pays | Amount | Refundable? |
|-----|----------|--------|-------------|
| Court-fee share | Accepter → escrow | The match's `courtFee` (their split of the venue cost) | Yes — refunded if the match isn't played |
| Platform fee | Accepter → CourtChamps | 10% of the court fee | **No — kept in every outcome** |

- Court fee is capped: **min £5, max £20**, or **0 for a free match** (enforced
  in `AddLadderMatchModal`, constants `MIN_COURT_FEE` / `MAX_COURT_FEE`).
- Nothing is charged when `courtFee === 0` — a free match skips settlement
  entirely.

## Charge-at-accept model

Money is taken **when the accepter accepts**, not near the match start. This is
the key decision:

1. **Accept** → an off-session PaymentIntent charges the accepter's court-fee
   share **plus** the 10% platform fee, settling into escrow (a held balance).
   - A match only transitions to `accepted` **once the charge succeeds**. If the
     card fails, the accept is rejected and the match stays open for someone
     else. There is never an accepted-but-unpaid match.
2. **Terminal** → `onLadderMatchStatusChange` fires once and calls
   `reconcileLadderCourtFee(match, outcome)`, which either **releases** the
   court-fee share to the poster or **refunds** it to the accepter. The 10%
   platform fee is retained in all cases.

### Why not authorise near the start?

An earlier design saved the card at accept and authorised ~1 day before the
match to dodge Stripe's ~7-day authorisation window. It was dropped because it
strands the poster: they book a court a week out, someone accepts, and the day
before the match the accepter's card fails — leaving the poster with a paid
court and no payment. Charging at accept means the money is already collected
before the poster is committed, and there is no 7-day window to manage, so the
booking horizon is a pure product choice with no payment-window constraint.
Posting closes a few days before the ladder's playoffs (`LADDER_POSTING_BUFFER_
DAYS` in `helpers/ladderDayTabs`, currently 5) so players have time to finish
every outstanding match and the playoff cloud function is never left waiting on
a last-minute match — this is a scheduling rule, unrelated to payments.

## Settlement per outcome

Driven by `LadderMatchOutcomeKind` in `courtFee.ts`. Only settles when
`courtFee > 0`.

| Outcome | Court-fee share | Platform fee | Notes |
|---------|-----------------|--------------|-------|
| `completed` | **Release to poster** | Kept | Court was used. |
| `walkover` — accepter no-showed (poster won) | **Release to poster** | Kept | Same as completed; accepter forfeits. |
| `walkover` — poster no-showed (accepter won) | **Refund to accepter** | Kept | Poster bears their own venue cost. |
| `cancelled` | **Refund to accepter** | Kept | Called off before any game. Revisit if a cancellation penalty is added. |
| `expired` | **Refund to accepter** | Kept | No activity for the expire window; court went unused. |

`walkover` is the only conditional case — settle by `match.walkoverWinner` (the
side that showed up).

## Economics — why the non-refundable 10% is safe

On a **refund**, Stripe returns the refunded amount but keeps the original
processing fee, so each refunded transaction costs CourtChamps roughly that fee
(~£0.20 fixed + a small percentage Stripe doesn't return). The retained 10%
covers it across the whole fee range:

| Court fee | 10% kept | Approx. Stripe cost on refund | Net |
|-----------|----------|-------------------------------|-----|
| £5 (min) | £0.50 | ~£0.20–£0.35 | Positive |
| £20 (max) | £2.00 | ~£0.20 + small % | Comfortably positive |

So a cancelled or expired match is never a loss — just a thinner margin than a
completed one. This holds **only** while the £5 floor stands; below ~£2 the
fixed Stripe fee starts eating the 10%. Do not lower `MIN_COURT_FEE` without
re-checking this.

## Implementation notes for the real settlement

- **Idempotency** — the trigger can re-fire on retries. Persist a marker (e.g.
  `feeSettledAt`) and no-op if already settled; never double-release or
  double-refund.
- **Failed payout** to the poster does not reverse the accepter's charge — the
  money stays in escrow and the payout is retried.
- **Small-fee floor** — if the £5 minimum is ever lowered, floor the platform
  fee at a minimum (e.g. `max(10%, £0.50)`) so the fixed Stripe fee is always
  covered. International / Amex cards and Connect payout fees cost more; size
  accordingly.

## Where users are told

The non-refundable platform fee must be disclosed. It currently appears in:

- **`AddLadderMatchModal`** — disclaimer under the court-fee input, shown only
  for paid matches: *"A 10% non refundable platform fee is deducted from this
  fee."*
- **`LadderTermsContent`** — the "Court fees" section states the
  charge-at-accept + refund-on-non-completion terms and that the 10% is
  non-refundable and retained to cover processing.

Keep both in sync with any change to this model.

# Ladder entry fees and prizes

How a paid ladder's entry fee is taken and its prize money paid. Free ladders
pay CP only through the same code. Nothing here moves money yet: the cash
steps are documented stubs, ready for the paid-ladder work.

## Entry fee

- A player (or a doubles team, once) pays the **entry fee plus a 10% platform
  fee** on top (`getLadderEntryPrice`). The whole entry fee goes into the prize
  pool; the platform fee is retained by Court Champs.
- Stub: `functions/src/helpers/chargeLadderEntryFee.ts`. Not wired: today the
  app writes the join itself. The paid work moves joining to a callable
  function that charges first and creates the participant (or team) only once
  the charge succeeds, so there is never a joined-but-unpaid player.
- A ladder cancelled by the platform refunds everything:
  `refundLadderEntryFees` (stub).

## Prize payout

Runs once, when the last deciding playoff tie settles
(`onLadderMatchStatusChange`), with `processLadderPhases` as the retry.
`completeAndPayLadder` does it in one transaction with the ladder's Completed
status and the `prizesDistributed` claim, so a retry never pays twice.

1. `planLadderPlayoffPrizes` (courtchamps-shared) works out every side's prize
   from `LADDER_PAYOUT_STRUCTURE`: the place prize, plus an equal share of the
   **Unclaimed Prize Pot** (money from void ties and empty places), split
   between both players of a doubles side.
2. One `ladders/{ladderId}/prizePayouts/{tieId}-{userId}` record per player:
   - `paid`: CP added to `profileDetail.XP` and `ladderStats` now; cash sent
     through `distributeLadderCash` (stub);
   - `held`: the player is disqualified; nothing is paid until an admin
     reviews it;
   - `kept`: the account was deleted; the prize is retained by Court Champs.
3. Unclaimed money with nobody left in the money to share it is retained by
   Court Champs (`retainedPrizeMoney` on the ladder).

## Review of a held prize

An admin sets `review` on the record from the website's Prize Payouts page:
pay in full, pay part, or withhold, with a reason. `onLadderPrizePayoutReviewed`
carries it out once (CP now, cash through `payHeldLadderPrize`, a stub) and
tells the player the outcome and reason. Whatever is not paid is retained by
Court Champs.

## What the paid work must add

- Wire `chargeLadderEntryFee`, `distributeLadderCash`, `payHeldLadderPrize`
  and `refundLadderEntryFees` to the payment provider, idempotent on the
  payout or ladder id.
- Increment `profileDetail.cashWon` with every cash prize paid. PROLevel reads
  it against thresholds set in one currency, so cash won in other currencies
  needs converting to that currency when it is recorded.

## Where users are told

`LadderTermsContent` sections 3 (entry fees), 4 (prizes and payouts) and 7
(disqualification). Keep them in sync with any change here.
