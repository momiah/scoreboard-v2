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

## Leaving a ladder

Section 14 of [ladder-reliability-test-plan.md](ladder-reliability-test-plan.md).
Reuse the `seedTeamDisbandFlow.js` variants (registration open, posted match,
accepted match, approved game, registration closed) for singles and doubles.

1. `leave-ladder-singles`: Ladder Menu → Leave Ladder → confirm → back on the
   ladder, no longer in the standings; the Join button is back.
2. `leave-ladder-doubles`: after leaving, the team still exists and is out of
   this ladder only.
3. `leave-ladder-blocked-*`: each block shows its message and nothing changes
   (registration closed, played a game, open match).

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
   tie must be finished by .*".
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
tab: "Schedule", matchId }`, or `tab: "Playoffs", tieId` for a playoff match)
and assert each opens the match
(`match-reminder-day-opens-match`, `match-reminder-hour-opens-match`).

## Refunds and the platform fee

The rule: the platform fee is refunded only when the **platform** cancels (the
backend, e.g. fewer than 128 entrants at registration close, or the admin). It
is kept whenever a **user** causes the refund (a match cancellation they
requested or agreed to), because Stripe still charges the platform.

| Cancellation | Who caused it | Refund |
|---|---|---|
| Ladder under 128 at registration close (`processLadderPhases`) | Platform | Everything paid: the entry fee and the platform fee on top (`refundLadderEntryFees`) |
| Ladder cancelled by the admin (no admin action yet) | Platform | Everything paid: the entry fee and the platform fee on top |
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
cases (deadlines, voids, walkovers, the day 3/6/9
reminders, settlement and the decider) are covered by the emulator suite;
these flows cover what a player and a spectator see.

**Seed.** `maestro/seeds/seedLadderPlayoffMatches.js` (harness buttons
`maestro-seed-playoff-match-<stage>`). It seeds "Maestro Playoffs 256", a
16-player bracket (best of 7) a week into round 1, with 3 days left. The test
user (ranked #1) hosts match 2; their lower-ranked opponent hosts and arranges
match 1 first. `seedLadderPlayoffMatchesFreeAndPaid` seeds the same playoffs on a
free ladder ("Maestro Playoffs 256") and a paid one ("Maestro Playoffs 256
(Paid)", £20 entry) to compare the prize banner. The user's own game is set by `stage`: `pending` (nothing arranged),
`leg1Posted`, `leg1Complete`, `level` or `settled`. The other round-1 games are
always the same, so spectator flows can rely on them:

- **neighbour** (the game next to the user's): match 1 complete (4-3), match 2
  in progress today, checked in, 1 game approved and 1 awaiting approval;
- **settled**: both matches complete, aggregate 7-5, the winner through to the
  Quarter-Final;
- **level**: 7-7 on aggregate, the deciding game accepted and checked in;
- **awaiting**: match 1 posted, awaiting the away side's confirmation;
- **upcoming**: both matches accepted, tomorrow and the day after, not
  checked in;
- **halfway**: match 1 complete (4-0), match 2 posted;
- **unarranged**: nothing arranged yet.

Every started match is checked in by both players, every completed match has a
side on the majority, and every match is inside its tie's 10 days.

More stages: `leg1PostedAfterDecline` (`scheduleDeclines: 1`), `noHomeCourt`
(the user has no home court), `leg1InProgress` and `playoffRegular` (match 1 with
its last game awaiting approval; `playoffRegular` adds a regular match,
`maestro-po-regular-match`, beside it), `leg2Posted`, `leg2Accepted` and
`leg2OneGame`. Every stage has a button for each ladder:
`maestro-seed-playoff-match-<stage>` (free) and
`maestro-seed-playoff-match-paid-<stage>`.

**Journey seed.** `maestro/seeds/seedLadderPlayoffJourney.js` carries the bracket
forward (buttons `maestro-seed-journey[-paid]-<round>-<stage>`): the test user
wins every earlier round (and loses the Semi-Final when the target is the
3rd-place tie), the other games are settled, and the user's own tie is scheduled
with match 1 or 2, or the decider, awaiting the user's approval of its last game.
Approving it fires the real `onLadderMatchStatusChange`, so settlement,
notifications and ladder completion are the backend's. Seeds: `r16-started`,
`r16-leg1-finishing`, `r16-leg2-{win,loss,level}`, `r16-decider-{win,loss}`,
`{qf,sf,final,third}-leg2-{win,loss}`.

**Opponent mocks.** `maestro/seeds/mockPlayoffOpponent.js`:
arrange, accept, decline, offer "play here" and tie chat (as the opponent), a
mock for each notification kind, and `mockFinishCompanionTie`, which plays out
the neighbouring tie (or the 3rd-place tie beside the Final, or the Final beside
the 3rd-place tie) through the same trigger. Assertion buttons
(`maestro-assert-po[-paid]-<key>`) check what the opponent, or the other tie's
winner and loser, received, and that the ladder is Completed.

**Other seeds.** `maestro-seed-join-singles-paid` (open £20 ladder),
`maestro-seed-add-game-flow-playoffs-in-{6,4}-days` (regular ladder with
playoffs 6 or 4 days away) and `maestro-seed-cancel-overdue-opponent-arrived`
(the opponent has an arrival at the court). `cleanupLadderTestData` also deletes
the notifications the backend sent to the bracket's players and the test user's
chats for these ladders.

Flows are covered as follows (all pass; see the playoff section of
[ladder-playoffs-test-plan.md](ladder-playoffs-test-plan.md) for scenario
numbers). Corrections found while building them: the poster-side Total Score on
the neighbour's match 2 reads "1 - 0" (not "0 - 1"), and the Matchmaking and
results-closed messages are as shown below.

| # | Flow |
|---|------|
| 1 | `ladder-playoffs-tap-game-opens-match` |
| 2 | `ladder-playoffs-tie-layout-spectator` |
| 3 | `ladder-playoffs-hosting-by-rank` |
| 4 | `ladder-playoffs-prize-banner` |
| 5 | `ladder-playoffs-tie-chat` |
| 6 | `ladder-playoffs-match-has-no-chat` |
| 7 | `ladder-playoffs-arrange-home` |
| 8 | `ladder-playoffs-arrange-without-home-court` |
| 9 | `ladder-playoffs-journey-play-here`, `-play-here-offered` |
| 10-12 | `ladder-playoffs-confirm-match`, `-decline-match`, `-decline-limit` |
| 13 | `ladder-playoffs-cancel-posted` (host sees `playoff-match-confirm-awaiting`) |
| 14-15 | `ladder-playoffs-cancel-posted`, `-cancel-accepted` |
| 16-17 | `ladder-playoffs-reschedule`, `-extension` |
| 18-20 | `ladder-playoffs-aggregate`, `-spectator-scores`, `-spectator-live` |
| 21 | `ladder-playoffs-journey-decider` (also `ladder-playoffs-auto-accept`: a 25-hour-old posted match is accepted by the scheduled job; it waits up to 25 minutes) |
| 22 | `ladder-playoffs-settled` |
| 23 | `ladder-playoffs-not-in-matchmaking` |
| 24 | `ladder-post-match-court-time` |
| 25 | `ladder-playoffs-report-during-playoffs`, `-approve-during-playoffs`, `-report-score` |
| 26 | `ladder-playoffs-notifications-open-playoffs` |
| 27-29 | `ladder-playoffs-guide-button`, `-guide-pages` |
| 30 | `ladder-summary-prize-pool` |
| 31 | `ladder-join-fee-on-top`, `ladder-join-payment-stub` |
| 32 | `ladder-match-lobby-address` |
| 33-34 | `ladder-playoffs-through-and-ready`, `-tie-wording` |
| 35-36 | `ladder-posting-closes-7-days`, `ladder-results-closing-banner`, `ladder-results-closed` |
| 37 | `ladder-no-show-opponent-arrived` |

The end-to-end journey (steps 1-10 of the brief) is `ladder-playoffs-journey-*`.
The shared steps live in `.maestro/utilities/playoffs/`.

TestIDs come from `PlayoffMatchDetails`, `PlayMatchTwoHere`, `MatchScoreBar`,
`AddLadderMatchModal` (playoff mode, via `PlayoffMatchScheduleModal`),
`PlayoffMatchConfirmBanner`, `MatchDetails` and `MatchDetailsMenu`.

**Opening a game**

1. `ladder-playoffs-tap-game-opens-match`: tap a bracket game →
   `playoff-match-details` with only the back button in the header (no title),
   then `playoff-prize-banner` above the tabs reading "Round of 16 · Tie N",
   `playoff-match-aggregate` and both info boxes.
2. `ladder-playoffs-tie-layout-spectator`: open each of the seeded spectator
   games in turn. Every screen has the same layout: the prize banner, the tabs,
   then the aggregate, then `playoff-match-format` and `playoff-match-deadline`
   ("N days and N hours" / "to complete both matches"), then match 1 and
   match 2 headed "Match N" with `playoff-match-leg{N}-host` (house icon and
   the host's name), and no "Best of" tag on match 1 and 2's cards. Nothing is tappable except match
   cards: no `playoff-match-leg*-arrange`. The Chat
   Room tab opens the blurred "Only the players in this tie can see this
   chat" notice.

**Hosting and what's next**

3. `ladder-playoffs-hosting-by-rank` (`pending`): match 1's heading names the
   opponent (`playoff-match-leg1-host`) with "Waiting for your opponent to
   arrange their home match"; match 2 names the user with
   "Your opponent arranges match 1 first" on match 2 until the opponent arranges
   match 1 (mocked), then `playoff-match-leg2-arrange` for any date. No coin.
4. `ladder-playoffs-prize-banner` (free and paid, `pending`): the card reads
   "Round of 16 · Tie N", "Current payout" on the left and "Quarter-Final
   payout" on the right, in whole amounts with a "·" between cash and CP and no
   "/", "Secured" or "No prize yet". Paid (£20): `playoff-prize-secured`
   "£0 · 0 CP", `playoff-prize-next` "£320 · 800 CP". Free:
   "0 CP" and "800 CP", no "£".
5. `ladder-playoffs-tie-chat` (`pending`): the Chat Room tab → send a message →
   it shows in the opponent's Chats list (mocked) and opens the tie on Chat Room.
6. `ladder-playoffs-match-has-no-chat`: a playoff match's screen has no Chat
   Room tab.

**Arranging, confirming and declining**

7. `ladder-playoffs-arrange-home` (`pending`): `playoff-match-leg2-arrange` →
   "Arrange match 2" with the home court in `add-ladder-match-court-selector`,
   best of 7 only, `add-ladder-match-court-time`, `add-ladder-match-no-fee` (no
   `add-ladder-match-fee`), and the date picker note "Please select a date
   within the 10 days for this tie (by …)". Change the court, pick a
   date, accept the terms → "Send to opponent" → match 2's card reads
   "Awaiting opponent's confirmation". Arranging it before match 1's date is
   allowed once match 1 is arranged.
8. `ladder-playoffs-arrange-without-home-court` (`noHomeCourt`): the modal opens
   on "Select Court"; any court can be chosen and sent.
9. `ladder-playoffs-play-match-two-here` (`leg1Complete`): open match 1 →
   `play-match-two-accept` "Play match 2 here" (no sub-text) → the alert
   "Play your 2nd match in this court" / "Your opponent must accept to
   continue. You do not need to re-check in" → confirm → match 2 posted at
   match 1's court; as the opponent (mocked accept) the user sees
   match 2 accepted with both players checked in, and the banner gone.
   Declining it leaves the one decline unused.
10. `ladder-playoffs-confirm-match` (`leg1Posted`): the card reads "Awaiting your
    confirmation"; the arranged notification ("… Open it to accept or
    decline.") opens the Playoffs tab; open the match →
    `playoff-match-confirm-request` → `playoff-match-confirm-accept` → card
    accepted.
11. `ladder-playoffs-decline-match` (`leg1Posted`): `playoff-match-confirm-decline`
    → back on the tie screen match 1 is the waiting placeholder again.
12. `ladder-playoffs-decline-limit` (`leg1PostedAfterDecline`): only
    `playoff-match-confirm-accept`, with "You've used your one decline, so
    please accept."; the notification ends "Open it to accept."
13. `ladder-playoffs-host-awaiting` (`leg1Posted`, as host via a second account
    or by seeding the user as host): `playoff-match-confirm-awaiting`.

**Cancelling, rescheduling and extending a playoff match**

14. `ladder-playoffs-cancel-posted` (`pending` after flow 7): Match Options →
    Cancel Match → "Cancel this playoff match? You can arrange it again before
    the playoff deadline." → straight back to the tie screen with
    `playoff-match-leg2-arrange`.
15. `ladder-playoffs-cancel-accepted`: an accepted playoff match → Cancel Match
    asks the opponent ("…cancel this playoff match…"); once accepted (mocked),
    the open match screen returns to the tie screen by itself.
16. `ladder-playoffs-reschedule`: an accepted playoff match with no games →
    Reschedule Match → the picker says "Please select a date by …" (the tie
    deadline); a later date is refused.
17. `ladder-playoffs-extension`: a playoff match with one game → Request
    Extension → "This tie must be finished by …".

**Scores, aggregates and spectators**

18. `ladder-playoffs-aggregate` (`leg1Complete`): `playoff-match-aggregate`
    reads "Aggregate" and "4 - 2" in bracket order (the user is team 1 here),
    green for the user.
19. `ladder-playoffs-spectator-scores`: open the **settled** game → aggregate
    "7 - 5", the gold `playoff-match-outcome` card "Winner · {name} · Through
    to the Quarter-Final", the deadline box "Finished";
    open its match 2 → Total Score names both players (the poster always on the
    left, for players and spectators alike),
    shows "4 - 3" from the poster's side in grey, both players checked in, and
    no `match-details-burger`.
20. `ladder-playoffs-spectator-live`: open the **neighbour** game's match 2 →
    "1 game awaiting approval" on the card, Total Score "0 - 1" from the
    poster's side (only the approved game counts), and the tie's aggregate
    reads "4 - 4" (match 1's 3-4 plus the approved game).
21. `ladder-playoffs-decider` (`level`): "Level on aggregate. One deciding game
    to play.", `playoff-match-decider` checked in; the decider notification
    opens the Playoffs tab.
22. `ladder-playoffs-settled` (`settled`): the gold `playoff-match-outcome`
    card names the user and "Through to the Quarter-Final", and the round-reached
    notification opens the Playoffs tab with the Quarter-Final open.

**Elsewhere**

23. `ladder-playoffs-not-in-matchmaking` (`leg1Posted`): the posted playoff match
    isn't in Matchmaking.
24. `ladder-post-match-court-time`: Post a Match shows "Book enough court time
    to finish: …" for the chosen best-of, and its date picker still says
    "within the next 3 months".
25. `ladder-playoffs-report-during-playoffs` (`playoffRegular`): report,
    approve and dispute a playoff game while the ladder is in playoffs; the
    regular match next to it stays frozen.
26. `ladder-playoffs-notifications-open-playoffs`: arranged, accepted,
    declined, cancellation, reschedule, extension and match-reminder
    notifications for a playoff match open the Playoffs tab, not Schedule.

**Guide, prizes and paying** (both seeded ladders, free and paid)

27. `ladder-playoffs-guide-button`: the ladder header's `ladder-how-to-play`
    reads "How to play playoffs" with a trophy, on a dark gold gradient with a
    bright gold border and glow; `ladder-playoff-guide-new` until it's opened
    once, then `ladder-playoff-guide-seen` (relaunch keeps it seen).
28. `ladder-playoffs-guide-pages`: swipe through the guide: 1 "Welcome to the
    Playoffs", 2 the playoffs structure (this ladder's size highlighted, the
    footnote with the cash pool on paid ladders and the CP pool), 3 "Prize
    Distribution" (`how-to-play-prize-table`), then Home and Away, Arrange Your
    Home Match, Win on Aggregate, Ten Days to Finish, Winning the Final. On a
    doubles ladder every page says "team", not "player".
29. `ladder-playoffs-guide-prize-table` (paid 256): Finish / Cash each / CP
    each, whole amounts: Champion £1793 · 4,480; Runner-up £1024 · 2,560;
    3rd place £614 · 1,536; 4th place £409 · 1,024; Quarter-Final £320 · 800.
    Free 256: no Cash column, same CP.
30. `ladder-summary-prize-pool`: the Summary tab starts with Total Prize Pool:
    `ladder-cash-pot` "£5120" on the paid ladder, `ladder-cp-pot` "12,800 CP"
    on the free one. Under it, in order: `ladder-stats-row`, Prize
    Distribution (top four as in flow 29), Top Contenders, then the user's
    position and home court. The loading skeleton has the same order.
31. `ladder-join-fee-on-top`: on an open paid ladder (£20), Join shows
    `join-ladder-price` "£22" with "£20 entry + £2 platform fee"; Pay → the
    payment stub says "Paying £22 (entry fee plus platform fee)". Terms section
    3 says the fee is added on top and the full entry fee goes into the pot. A
    free ladder shows no price.
32. `ladder-match-lobby-address`: open any match with a court → under the court
    name, `match-details-card-address` reads "{address}, {city}, {postcode}"
    (seeded playoffs court: "1 Test Street, {city}, TE1 1ST"); match cards in
    lists (Schedule, playoff legs) still show only the city.

33. `ladder-playoffs-through-and-ready`: the "You're through to the
    Quarter-Final" notification (seeded) opens the Playoffs tab on the
    Quarter-Final, which reads "Arranged once both players are known"; the
    "Your Quarter-Final is ready" notification names the opponent and opens the
    tie with match 1 to arrange.
34. `ladder-playoffs-tie-wording`: the tie card reads "Round of 16 · Tie N",
    the Chat Room notice "Only the players in this tie can see this chat", the
    guide and Rules say "Each playoff tie is two matches", and Match Options →
    Request Extension says "This tie must be finished by …".

**Before the playoffs** (needs a seed with `playoffStartsAt` 6 and 4 days away)

35. `ladder-posting-closes-7-days`: with P 6 days away, Matchmaking shows the
    posting-closed state and Post a Match is unavailable.
36. `ladder-results-closed`: with P 6 days away, a player's accepted regular
    match shows `results-close-awaiting` "Ladder results close in 1d …. Finish
    and report your games before then."; with P 4 days away it reads "Ladder
    results have closed for the playoffs…", tapping the next game opens
    `results-closed-modal` ("Ladder results have closed", with both dates)
    instead of the score form, and approving a pending game still works.
37. `ladder-no-show-opponent-arrived`: seeded match with the opponent's
    arrival → `match-checkin-report-no-show` reads "Your opponent has arrived"
    and `match-checkin-opponent-arrived` explains why. (The location check
    itself can't run in Maestro; cover it with a mocked arrival.)

Backend-only and covered by the emulator suite, no flow needed: the deciding
game is placed at the court and time of whichever match was played last, the
platform-cancelled refund is the entry fee plus the platform fee, the P − 1
close-out (discarded disputes, settled or closed no-shows, expired matches),
and `recordLadderArrival`'s checks.

Cleanup: `cleanupLadderTestData` deletes the whole playoffs ladder (ties and
every match, including `-leg1`, `-leg2`, `-leg3`), the fixture users and courts,
and the test user's notifications for the ladder.
