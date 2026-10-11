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
  with Accept / Decline. The requester's side sees "Waiting for
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

Also covered: the app sends the right notification on each step (the request
reaches the opponent; accepting or declining reaches the requester's whole
side, both players in doubles), the requester sees the response notification
and it opens the match's ladder, and in doubles either opposing player can
respond.

Still to cover:

- The court-fee refund on accept (server-side; see below).

## Reschedule and extension

Scenarios are in section 12 of
[ladder-reliability-test-plan.md](ladder-reliability-test-plan.md). Seeds to
add (extend `maestro/seeds/seedMatchCancellationFlow.js` rather than a new
file): an accepted singles match with no games; one with an opponent's
`rescheduleRequest` pending; one with one reported game; one already extended;
a playoff leg with one reported game and a tie deadline 3 days away. Mock the
opponent's response like `mockOpponentCancellationResponse.js`.

Flows (testIDs: `match-menu-RescheduleMatch`, `match-menu-Extension`,
`reschedule-info-modal`, `reschedule-match` (+ `-start-plus`, `-send`,
`-error`), `extension-info-modal`, `match-reschedule-awaiting`,
`match-reschedule-request`, `match-reschedule-accept`,
`match-reschedule-decline`):

1. `reschedule-request-sent`: menu → Reschedule Match → info modal → Choose a
   time → pick a date → Send to opponent → back on Match Details with
   `match-reschedule-awaiting`; the menu shows "Reschedule requested".
2. `reschedule-past-time-refused`: pick today with a start time already passed
   → `reschedule-match-error` "Pick a date and time in the future."
3. `reschedule-opponent-request-accept`: `match-reschedule-request` reads "Your
   opponent asked to move this match to .*" → Accept → the card shows the new
   date.
4. `reschedule-opponent-request-decline`: Decline → banner gone, date unchanged.
5. `reschedule-requester-sees-accept` (mocked response): after the opponent
   accepts, the notification ".* agreed to move your ladder match.*" opens the
   match with the new date.
6. `extension-request`: one reported game → menu shows "Request Extension", no
   Reschedule → info modal → Extend match → "Already extended" on reopening the
   menu.
7. `extension-playoff-deadline`: playoff leg → the info modal shows "This
   playoff game must be finished by .*".
8. `extension-already-used`: "Already extended" is greyed and opens nothing.
9. `reschedule-hidden-when-posted`: a posted match's menu has neither option.

The 1-day-left reminder is server-side (`autoExpireLadderMatches`), covered in
the functions unit tests; a seeded notification with that text can be asserted
to open the match.

## Match reminders

Sent by the scheduled `sendLadderMatchReminders` (section 13 of
[ladder-reliability-test-plan.md](ladder-reliability-test-plan.md)), covered
in the functions unit tests. Maestro: seed the two reminder notifications
exactly as the function writes them (title "Match reminder", `data { ladderId,
tab: "Schedule", matchId }`) and assert each opens the match
(`match-reminder-day-opens-match`, `match-reminder-hour-opens-match`).

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
| Accepted match expired | Both sides inactive | Nothing refunded — the court-fee share is released to the poster, who paid for the court |
| Poster no-show | Poster | Accepter's court-fee share refunded; platform fee kept |

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

- `ladder-playoffs-tap-game-opens-match` replaces the old "tap does nothing"
  flow (2.4).
- The bracket glow is an animation, so Maestro only asserts the game is on
  screen; the scroll target logic stays covered in Jest.

### Phase 2: playoff matches

Rules and scenario numbers are in section 6 of
[ladder-playoffs-test-plan.md](ladder-playoffs-test-plan.md). Backend-only
cases (simultaneous coin flips, deadlines, voids, walkovers, reminders) are
covered by the emulator; Maestro covers what a player sees.

Seeds: `maestro/seeds/seedLadderPlayoffMatches.js` (harness buttons
`maestro-seed-playoff-match-<stage>`) covers `coinPending`, `coinWon`,
`coinLost`, `leg1Posted`, `leg1Complete`, `level` and `settled`, and dresses
other games as a viewer sees them (in progress, played, void, level). Still to
add: `noHomeCourt` and `playoffRegular` (a regular match alongside a playoff
match during playoffs).

Flows (testIDs from `PlayoffMatchDetails`, `PlayoffCoinFlip` and
`ScheduleMatchModal`):

1. `ladder-playoffs-coin-flip` (`coinPending`): tap `playoff-coin-flip` →
   "Coin toss: .* hosts the first match" (`playoff-coin-result`).
2. `ladder-playoffs-coin-viewer` (`viewer`): `playoff-coin-waiting` visible,
   no `playoff-coin-flip`.
3. `ladder-playoffs-arrange-home` (`coinWon`): tap
   `playoff-match-leg1-arrange` → `arrange-playoff-match` with "Arrange match
   1", the court name and `arrange-playoff-match-court-time` ("about 2 hours
   for best of 7"); send without a date → `arrange-playoff-match-error` "Pick a
   date."; pick a date and time → send → match 1 card shows posted.
4. `ladder-playoffs-arrange-away-waiting` (`coinLost`): "Waiting for .* to
   arrange this match" on match 1; `playoff-match-leg2-arrange` visible.
5. `ladder-playoffs-arrange-needs-home-court` (`noHomeCourt`): "Choose your
   home court to arrange this match." and the home court picker; choose one →
   the Arrange button appears.
6. `ladder-playoffs-accept-match` (`leg1Posted`): tap
   `playoff-match-leg1-accept` → card shows accepted. A host-side run of the
   same seed asserts no accept button.
7. `ladder-playoffs-play-here-now` (`leg1Complete`): `playoff-match-play-here`
   visible on match 2; aggregate reads "2 – 1".
8. `ladder-playoffs-report-during-playoffs` (`playoffRegular`): open the playoff
   match → report a score, approve from the notification modal, open a
   dispute: all allowed. Then open the regular match → the freeze disclaimers
   still show and actions stay locked.
9. `ladder-playoffs-decider` (`level`): "Level on aggregate. One deciding game
   to play." and `playoff-match-decider`; the decider notification opens the
   screen.
10. `ladder-playoffs-settled` (`settled`, `void`): `playoff-match-outcome`
    reads "X goes through." / "Not played in time, so neither side goes
    through.", no coin result.
11. `ladder-playoffs-round-reached-notification`: the seeded "Congratulations!
    You've reached the …" notification opens the next game's screen.
12. `ladder-post-match-court-time`: Post a Match shows the court-time line for
    the ladder's best-of.
13. Matchmaking (`leg1Posted`): the posted playoff match is not listed.

Cleanup: `cleanupLadderTestData` must also delete `playoffTies` legs (match
ids ending `-leg1`, `-leg2`, `-leg3`) and the coin-flip, decider, reminder and
round-reached notifications.
