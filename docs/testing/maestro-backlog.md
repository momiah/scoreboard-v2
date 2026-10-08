# Maestro backlog

Flows to add when the related feature is next under Maestro test. Remove an
entry once its flow exists.

## Team disbanding (doubles ladders)

The rule (`disbandTeam` in `context/LadderContext.tsx`, helpers in
`helpers/teamLadderActivity.ts`). A team **cannot** disband while, in a ladder
that is still running (not completed or cancelled), it:

- has completed (approved) a game in that ladder;
- has a posted or accepted match in that ladder — it must cancel it first;
- or any of its ladders has closed registration or is in playoffs.

Games and matches in other ladders, or in completed/cancelled ladders, don't
count. Cancelling: Match Details → menu (☰) → Cancel Match. Any player in the
match (poster, accepter, or either partner) can cancel a posted or accepted
match until a game has been reported.

Covered by `team-disband-*` flows (seeds in `maestro/seeds/seedTeamDisbandFlow.js`):
registration open (1), posted match blocks then cancelling it allows (2), an
accepted match blocks (3, blocked only), one approved game blocks (6), games
only in another completed ladder don't count (7), registration closed and
playoffs block (8), completed ladder allows (9).

Also covered: the partner's request agreed by the opponent (4), the user's own
request agreed by the opponent (3b), an unanswered request blocks, and a
reported game blocks both Cancel Match and Disband (5). Singles has no leave
option, so disbanding is doubles only.

## Match cancellation

Helpers in `helpers/ladderMatchCancellation.ts`, UI via
`hooks/useLadderMatchCancellation.ts`.

- **Posted** match (nobody accepted): the poster or their partner cancels it
  straight away from (a) the Matchmaking modal on their own match ("Cancel
  Match"), (b) Ladder Menu → Current Posted Matches → Cancel, or (c) Match
  Details → menu → Cancel Match.
- **Accepted** match, no game reported: Cancel Match sends a cancellation
  request. The opposing side gets a notification and a banner on Match Details
  with Accept Cancellation / Decline. The requester's side sees "Waiting for
  your opponent to respond". The requester's partner cannot respond.
- Accept → match cancelled, requester's side notified, court fee refunded to
  the accepter server-side. Decline → request cleared, requester's side
  notified, match goes ahead (play it or face a no-show).
- A reported game → "This match can no longer be cancelled".

Covered by `cancel-*` flows (seeds in
`maestro/seeds/seedMatchCancellationFlow.js` and `seedTeamDisbandFlow.js`; the
opponent's response is mocked by `mockOpponentCancellationResponse`): cancelling
a posted match from Matchmaking and from Ladder Menu → Current Posted Matches;
requesting cancellation of an accepted match and the opponent accepting or
declining; receiving an opponent's request and accepting or declining it; a
second request being refused; a reported game blocking cancellation; and the
requester's partner seeing "Waiting" with no Accept or Decline (doubles).

Still to cover:

- Doubles: either opponent can respond (the flows only use one opponent).
- The requester's side receiving the notification after the response.
- The court-fee refund on accept (server-side; see below).

## Refunds and the platform fee

The rule: the platform fee is refunded only when the **platform** cancels (the
backend, e.g. fewer than 128 entrants at registration close, or the admin). It
is kept whenever a **user** causes the refund (a match cancellation they
requested or agreed to), because Stripe still charges the platform.

| Cancellation | Who caused it | Refund |
|---|---|---|
| Ladder under 128 at registration close (`processLadderPhases`) | Platform | Full entry fee, platform fee included (`refundLadderEntryFees`) |
| Ladder cancelled by the admin (no admin action yet) | Platform | Full entry fee, platform fee included |
| Posted match cancelled before anyone accepted | User | Nothing to refund — the accepter is only charged on accept |
| Accepted match cancelled by agreement | User | Accepter's court-fee share refunded; platform fee kept (`reconcileLadderCourtFee` via `onLadderMatchStatusChange`) |
| Accepted match expired / poster no-show | — | Accepter's court-fee share refunded; platform fee kept |

Payments are stubs today, so Maestro can only assert the UI. Flows to cover:

1. Accept a cancellation request → the confirm alert says the court fee is
   refunded to the player who accepted the match → match shows as cancelled.
2. Paid ladder under 128 at registration close (seeded) → Playoffs tab shows
   "This ladder was cancelled" with "Too few registrations".
3. Once payments are built: assert the refund amounts above (with and without
   the platform fee) through the payment provider's test mode, and that a
   re-fired trigger never refunds twice.

## Ladder playoffs

Phase 1 (bracket generation, Playoffs tab, cancellation and promotion
notifications) is covered in
[ladder-playoffs-test-plan.md](ladder-playoffs-test-plan.md), including the
manual Cloud Scheduler checks. Remaining:

- Update `ladder-playoffs-tap-game-does-nothing` when Phase 2 adds the playoff
  match screen, and add flows for the match, scheduling and result notifications
  once they exist.
- The bracket glow is an animation, so Maestro only asserts the game is on
  screen; the scroll target logic stays covered in Jest.
