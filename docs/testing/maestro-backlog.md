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
2. `leave-ladder-doubles`: the confirm mentions the partner; after leaving the
   partner has "{name} took your team out of {ladder}." and the team still
   exists.
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
cases (deadlines, voids, walkovers, the day 3/6/9
reminders, settlement and the decider) are covered by the emulator suite;
these flows cover what a player and a spectator see.

**Seed.** `maestro/seeds/seedLadderPlayoffMatches.js` (harness buttons
`maestro-seed-playoff-match-<stage>`). It seeds "Maestro Playoffs 256", a
16-player bracket (best of 7) a week into round 1, with 3 days left. The test
user (ranked #1) hosts match 2 and any decider; their lower-ranked opponent hosts
match 1. The user's own game is set by `stage`: `pending` (nothing arranged),
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

Still to add: `leg1PostedAfterDecline` (`scheduleDeclines: 1`), `noHomeCourt`
(host with no home court) and `playoffRegular` (a regular match alongside a
playoff match during playoffs).

TestIDs come from `PlayoffMatchDetails`, `PlayMatchTwoHere`, `MatchScoreBar`,
`AddLadderMatchModal` (playoff mode, via `PlayoffMatchScheduleModal`),
`PlayoffMatchConfirmBanner`, `MatchDetails` and `MatchDetailsMenu`.

**Opening a game**

1. `ladder-playoffs-tap-game-opens-match`: tap a bracket game →
   `playoff-match-details` titled "Round of 16 · Game N", `playoff-match-next`,
   `playoff-match-aggregate` (with "#rank · name") and both info boxes.
2. `ladder-playoffs-tie-layout-spectator`: open each of the seeded spectator
   games in turn. Every screen has the same layout: the "What's next" card,
   then the aggregate, then `playoff-match-format` and `playoff-match-deadline`
   ("N days and N hours" / "to complete both matches"), then match 1 and
   match 2 headed "Match N" with `playoff-match-leg{N}-host` (house icon and
   the host's name), and no "Best of" tag on match 1 and 2's cards. Nothing is tappable except match
   cards and the What's next card: no `playoff-match-leg*-arrange`. The Chat
   Room tab opens the blurred "Only the players in this game can see this
   chat" notice.

**Hosting and what's next**

3. `ladder-playoffs-hosting-by-rank` (`pending`): match 1's heading names the
   opponent (`playoff-match-leg1-host`) with "Waiting for your opponent to
   arrange their home match"; match 2 names the user with
   `playoff-match-leg2-arrange`. No coin anywhere.
4. `ladder-playoffs-whats-next`: `playoff-match-next` reads "The winner plays
   the winner of Game N in the Quarter-Final" and opens that game; on the
   **settled** game's neighbour it names the settled winner instead.
5. `ladder-playoffs-tie-chat` (`pending`): the Chat Room tab → send a message →
   it shows in the opponent's Chats list (mocked) and opens the tie on Chat Room.
6. `ladder-playoffs-match-has-no-chat`: a playoff match's screen has no Chat
   Room tab.

**Arranging, confirming and declining**

7. `ladder-playoffs-arrange-home` (`pending`): `playoff-match-leg2-arrange` →
   "Arrange match 2" with the home court in `add-ladder-match-court-selector`,
   best of 7 only, `add-ladder-match-court-time`, `add-ladder-match-no-fee` (no
   `add-ladder-match-fee`), and the date picker note "Please select a date
   within the 10 days for this playoff game (by …)". Change the court, pick a
   date, accept the terms → "Send to opponent" → match 2's card reads
   "Awaiting opponent's confirmation". Picking a time before match 1 (seed
   match 1 first) shows "Match 2 must be played after match 1 (…)".
8. `ladder-playoffs-arrange-without-home-court` (`noHomeCourt`): the modal opens
   on "Select Court"; any court can be chosen and sent.
9. `ladder-playoffs-play-match-two-here` (`leg1Complete`): open match 1 →
   `play-match-two-accept` "Play match 2 here" → confirm → match 2 posted at
   match 1's court; as the opponent (mocked accept) the user sees
   `play-match-two-ready` → "Open match 2" with both players checked in.
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
    Extension → "This playoff game must be finished by …".

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

Cleanup: `cleanupLadderTestData` deletes the whole playoffs ladder (ties and
every match, including `-leg1`, `-leg2`, `-leg3`), the fixture users and courts,
and the test user's notifications for the ladder.
