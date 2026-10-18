# Ladder Playoffs (Phase 1) — Test Plan

Scenarios for ladder playoff **bracket generation, the Playoffs tab, the
Summary status stat, the Schedule placeholder and the cancellation / promotion
notifications**, with the expected outcome for each. Layers:

- **Jest** — the seed fixtures (exact qualifiers per tier, pinned games,
  notifications, variants), the bracket component and the function. Marked 🅹.
- **E2E** (Maestro) — real journeys on the iOS simulator. Marked 🅼.
- **Emulator** — the real `processLadderPhases` function against a Firestore
  emulator (`npm --prefix functions run test:emulator`). Marked 🅴.

Phase 2 (the playoff match screen, aggregate scoring, scheduling) is in
section 6. Phase 3 (payout) is not covered.

## Rules under test (not changed here)

- **Playoff spots by registrations** (doubles counts teams): 2048 → top 128,
  1024–2047 → top 64, 512–1023 → top 32, 256–511 → top 16, 128–255 → top 8
  (shared `getLadderPlayoffQualifiers`).
- **Cancellation:** fewer than 128 at registration close → Cancelled, reason
  "Too few registrations". After registration close a ladder is never
  cancelled; 128 or fewer at playoff start is a top 8.
- **Qualifiers:** ranked by CP → wins → point difference → global XP → joined
  first. Every spot is filled; no home court means paired last. Round 1 pairs
  the nearest home courts.
- **Notifications** (`functions/src/processLadderPhases.ts`, type `ladder`,
  routed by `NotificationRow` on `data.tab`):
  - Cancelled → every entrant, `tab: "Summary"`: "{ladder} has been cancelled
    because not enough players signed up before registration closed. If you
    paid an entry fee, it will be refunded to you in full."
  - Playoffs generated → every qualifier, `tab: "Playoffs"`: "Congratulations!
    You've made the playoffs for {ladder}. You have N days to play your next
    round." (N is `LADDER_PLAYOFF_TIE_DAYS`, 10 today)
  - Playoffs generated → every entrant who did not qualify (both players of an
    eliminated doubles team), `tab: "Playoffs"`: "The playoffs in {ladder}
    have started, and unfortunately you didn't make the cut this time. The
    ladder is now closed, so you can no longer post matches. Thank you for
    playing, and come back next season for another chance to win!" Sent once,
    only when the bracket is generated (never on a cancelled ladder or a
    re-run).
- **Summary third stat:** Registration Open/Closed shows the "To Playoffs"
  countdown (`ladder-playoff-countdown`); otherwise "Status" with "Playoffs",
  "Completed" or "Cancelled" as plain text (`ladder-status`).
- **Playoffs tab:** `BracketTree`, opens scrolled to the signed-in player's
  game with the glow. Not started: "Playoffs haven't started yet" and "The top
  N players/teams in the ladder qualify…". Cancelled: "This ladder was
  cancelled" and the reason.
- **Schedule tab:** a qualifier sees the gold placeholder "Congratulations on
  reaching playoffs! Please find your next game in the Playoffs tab"
  (`schedule-playoff-placeholder`); tapping it switches to the Playoffs tab.
  Non-qualifiers do not see it.

## 1. Qualifiers per tier

The test user is ranked #1 and fixtures `P0001 S`… follow in rank order, so the
qualifiers are the test user plus `P0001…P(N−1)` and `P(N)` is absent.

| # | Scenario | Expected |
|---|----------|----------|
| 1.1 | Singles, 2048 / 1024 / 512 / 256 / 128 registrations, bracket generated | Top 128 / 64 / 32 / 16 / 8. Round 1 shows the header below, the user's game shows the pinned opponent, the last qualifier's game is in the list and `P(N)` is not 🅼 🅹 |
| 1.2 | Boundaries 255, 511, 1023 registrations | Top 8, 16, 32 (the tier below), exactly the same qualifiers as 128, 256, 512 🅼 🅹 |
| 1.3 | Doubles, 256 teams | Top 16, "Round of 16"; the user's game shows both teams' four names 🅼 🅹 |
| 1.4 | Doubles, 128 teams | Top 8, "Quarter-Final" 🅼 🅹 |
| 1.5 | The exact qualifier list for every tier and the user's pinned game | Asserted against the shared helper for all eight singles tiers and both doubles tiers 🅹 |

Pinned values (from the seed's ranking and the shared pairing helper; a Jest
guard fails if they drift):

| Registrations | Bracket | First round header | User's game | User's opponent | Last qualifier's game |
|---|---|---|---|---|---|
| 2048 | 128 | Round of 128 | `r1-s8` (Game 9) | P0008 S | P0127 S in `r1-s55` |
| 1024 | 64 | Round of 64 | `r1-s4` (Game 5) | P0008 S | P0063 S in `r1-s27` |
| 512, 1023 | 32 | Round of 32 | `r1-s2` (Game 3) | P0008 S | P0031 S in `r1-s13` |
| 256, 511 | 16 | Round of 16 | `r1-s1` (Game 2) | P0008 S | P0015 S in `r1-s6` |
| 128, 255 | 8 | Quarter-Final | `r1-s0` (Game 1) | P0001 S | P0007 S in `r1-s3` |
| Doubles 256 | 16 | Round of 16 | `r1-s1` | P0016 S & P0017 S (user's partner P0001 S) | P0014 S & P0015 S v P0030 S & P0031 S in `r1-s6` |
| Doubles 128 | 8 | Quarter-Final | `r1-s0` | P0002 S & P0003 S (user's partner P0001 S) | P0012 S & P0013 S v P0014 S & P0015 S in `r1-s3` |

## 2. Bracket structure and behaviour

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | Round structure (256 → top 16) | Tabs Round of 16, Quarter-Final, Semi-Final, Final; each round's first game is visible; the Final tab shows the Final (`r4-s0`) and the 3rd/4th Playoff (`r4-s1`) as TBD 🅼 |
| 2.2 | Proximity pairing (2048) | The user's London opponent is P0008 S and the neighbouring game is P0016 S v P0024 S, all London 🅼 🅹 |
| 2.3 | Tree / list toggle | Switching view keeps the selected round (Quarter-Final) in both directions 🅼 |
| 2.4 | Tapping a bracket game | Opens the playoff match screen for that game: title "{round} · Tie N", aggregate card and "Best of N per match · Finish by …"; no score input or approval modal 🅼 |
| 2.5 | Bracket scroll target and glow | The user's game is on screen without scrolling (see section 3); the glow itself is an animation and is covered by the scroll-target tests in Jest 🅹 |
| 2.6 | Loading skeleton | `ladder-playoffs-loading` shows until the ties load 🅹 (the skeleton lasts milliseconds, so Maestro does not assert it) |

## 3. Reaching the ladder and the player's game

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Promotion notification | The exact promotion message; tapping it opens the Playoffs tab with the bracket and the user's game (2048 → `r1-s8` v P0008 S) on screen 🅼 🅹 |
| 3.2 | Playoffs tab from the ladder | Open the ladder on Summary, tap the Playoffs tab: same game on screen 🅼 |
| 3.3 | Schedule placeholder | Schedule shows the gold placeholder text; tapping it switches to the Playoffs tab with the user's game on screen 🅼 |
| 3.4 | Not qualified (ranked just below the cutoff) | The exact elimination message and no promotion message; tapping it opens the Playoffs tab at the top (`r1-s0`) with the user not in the bracket; no Schedule placeholder 🅼 🅹 🅴 |

## 4. Summary and standings

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | Not started (playoff start in the future) | Summary shows "To Playoffs" with the countdown and no Status; the Playoffs tab shows "Playoffs haven't started yet" and "The top 16 players in the ladder qualify…" 🅼 |
| 4.2 | Playoffs running | Summary's third stat reads "Status" / "Playoffs" and there is no countdown 🅼 |
| 4.3 | Cancelled (127 registrations) | The exact cancellation message; tapping it opens Summary with "Status" / "Cancelled"; the Playoffs tab shows "This ladder was cancelled" and "Too few registrations"; the Schedule tab has no placeholder 🅼 🅹 |
| 4.4 | Summary on a 2048 ladder | Renders; "Players" reads "2048 / 2048"; Top Contenders shows exactly 4 rows with the test user first; the Participants carousel shows at most 20 avatars 🅼 |
| 4.5 | Standings | Performance → "View all players" opens the full-screen standings; tapping a player opens Player Details as a full screen, not a modal 🅼 |

## 5. The Cloud Function and push (automated)

`functions/src/processLadderPhases.emulator.test.ts` runs the real
`runProcessLadderPhases` against a Firestore emulator (real transactions,
`where in`, counts, bulk reads) with only the Expo push HTTP call intercepted.
Run it with:

```bash
npm --prefix functions run test:emulator
```

It needs Java 17 or newer and downloads a pinned `firebase-tools@13` through
`npx` on first use. The plain `npm test` skips it. Cases 🅴:

| # | Scenario | Expected |
|---|----------|----------|
| 5.1 | 2048 registrations at playoff start | Ladder `status: playoffs`, `playoffBracketSize: 128`, `playoffEntrantCount: 2048`, 128 `playoffTies`; 2048 notifications, one per user: 128 promotions to exactly ranks 1–128 and 1920 elimination notices, with the exact messages and `data { ladderId, tab: "Playoffs" }` |
| 5.2 | Push for the same run | 2048 Expo requests, one per device token; the qualifier's push carries "You made the playoffs!" and its message, an eliminated player's carries "Playoffs have started" and its message, each with `sound`, `priority: high` and `data { ladderId, tab, type: "ladder" }` |
| 5.3 | Running it again | Ladder unchanged, still 128 ties, no new notifications and no new push requests |
| 5.4 | 127 registrations at registration close | Ladder Cancelled with "Too few registrations", no ties, the refund runs, every entrant gets the exact cancellation message once (and a push); a second run adds nothing |
| 5.5 | 300 registrations at registration close | Registration Closed, no bracket, no notifications |
| 5.6 | 100 entrants at playoff start (dropped below 128 after close) | Not cancelled; top 8, 8 promotions and 92 elimination notices |
| 5.7 | 128-team doubles ladder | Top 8, 8 ties; both players of each team are notified, 16 promotions and 240 elimination notices |
| 5.8 | Schedule | The function runs every 15 minutes |

The unit tests in `functions/src/processLadderPhases.test.ts` cover the same
rules with a faked Firestore (including qualifier ranking, tie-breaks and
doubles teams).

## 6. Phase 2: playoff matches

Each game in the bracket is two matches, home and away, plus one deciding game
if the aggregate is level. Rules: games won across both matches decide it; best
of 5 up to the Round of 32, best of 7 from the Round of 16 (3rd place included);
the decider is best of 1 at the court of whichever match was played last. The
lower-ranked side (by ladder rank) hosts match 1 and arranges it first; once it's
arranged, the higher-ranked side can arrange match 2 for any date, even earlier. Each game has 10 days, with reminders on day 3, 6 and 9. At the
deadline: games won, then point difference, then the higher rank; nothing
played means void, and the next-round opponent gets a walkover. Playoff games
update the global profile only, never ladder standings.

| # | Scenario | Expected |
|---|----------|----------|
| 6.1 | Anyone opens a game with both sides known | No coin toss. No title in the header (just the back button). At the top, a prize card styled like a match card: "Round of N · Game N", then "Current payout" on the left (left-aligned) and "<next round> payout" on the right (right-aligned, "Champion payout" in the Final, "3rd place payout" in the 3rd-place tie), each as "£X · X CP" on a paid ladder or "X CP" on a free one, in whole amounts (£0 · 0 CP when nothing is paid yet), then the Tie Lobby / Chat Room tabs. Match 1 is headed with the lower-ranked side's name, match 2 with the higher-ranked side's; the aggregate shows plain names 🅹 🅼 |
| 6.5 | The lower-ranked player, match 1 not arranged | The "Arrange your home match" placeholder opens the Post a Match modal titled "Arrange match 1": home court preselected (any court can be chosen), best of 7 fixed, shuttle type to choose, the court-time line, "There are no court fees in the playoffs…" instead of a fee, and "Send to opponent" 🅹 🅼 |
| 6.6 | The higher-ranked player, match 1 not arranged | "Waiting for your opponent to arrange their home match" on match 1; their own "Arrange your home match" on match 2. Onlookers see "Waiting for X to arrange their home match"; before both players are known, both read "Arranged once both players are known" 🅹 🅼 |
| 6.6a | Arranging order | Match 2's host sees "Your opponent arranges match 1 first" (others "Arranged once match 1 is arranged") until match 1 is arranged; then match 2 can be arranged for any date, even before match 1. Arranging match 2 first is refused ("Match 1 has to be arranged first.") 🅹 |
| 6.6b | Match 1 finished | On match 1's screen both players see a "Play match 2 here" button (no sub-text) → "Play your 2nd match in this court" / "Your opponent must accept to continue. You do not need to re-check in." → match 2 is posted at match 1's court, starting now; the opponent sees "Your opponent wants to play match 2 here now. Are you up for it?" with Accept/Decline. Accepting carries match 1's check-in over; declining doesn't use the one decline. Once accepted the banner goes away 🅹 🅼 |
| 6.7 | Host without a home court | No court preselected; they pick any court in the modal 🅹 🅼 |
| 6.8 | Arrange: past time, no date, after the tie deadline | Inline error inside the modal; nothing written 🅹 🅼 |
| 6.9 | Arrange the same match twice | The second write is refused ("exists") 🅹 |
| 6.10 | A posted match | The away side's card reads "Awaiting your confirmation", the host's "Awaiting opponent's confirmation". The away side gets "{host} arranged playoff match N at {court}, {date}. Open it to accept or decline." On the match screen they Accept or Decline; the host sees "Waiting for your opponent to confirm this time". Accepting notifies the host "{name} accepted…". Declining cancels the posted match, notifies the host "{name} can't make… Arrange another time." and the host's "Arrange your home match" returns 🅹 🅼 |
| 6.10a | A second arrangement after one decline | The decline count carries over; the away side can only Accept ("You've used your one decline, so please accept."), and the notification says "Open it to accept." 🅹 🅼 |
| 6.10b | The host cancels a posted playoff match from Match Options | "Cancel this playoff match? You can arrange it again before the playoff deadline." → straight back to the tie screen with "Arrange your home match" 🅹 🅼 |
| 6.10c | A playoff match is cancelled or expires while its Match Details is open | The screen returns to the tie screen instead of showing a stale cancelled match 🅹 |
| 6.10d | Notifications about a playoff match (arranged, accepted, declined, cancellation) | Open the ladder on the Playoffs tab, where the user's game is highlighted, not the Schedule tab 🅹 |
| 6.10e | Arrange modal date picker | Says "Please select a date within the 10 days for this tie (by Ddd D MMM)." 🅹 🅼 |
| 6.10f | An onlooker opens any tie (open, waiting or finished) | Same layout as players: the prize banner, the aggregate, both info boxes ("Finished" once settled), and a placeholder or card for each match. Only players can tap anything 🅹 🅼 |
| 6.10g | Any viewer opens a match | Total Score always shows the poster on the left and the accepter on the right, counting approved games; a player sees it green if they're winning and red if losing, a spectator sees grey. Empty game cards list the poster first too. The tie's aggregate is always in bracket order (team 1 left). No match menu for spectators 🅹 🅼 |
| 6.10h | A spectator on a playoff match | No check-in button (the header card shows the match status instead), unreported games can't be tapped (reported ones open read-only), and a posted match reads "Awaiting confirmation" rather than "your"/"opponent's" wording. Playoff notifications (decider, void, round reached) go only to the tie's players 🅹 🅼 |
| 6.10i | Talking about a playoff game | The tie's players get "Chat Room" and "Tie Lobby" tabs on the tie screen: one conversation for the whole game, open before anything is arranged. Playoff match screens have no Chat Room tab. A message lands in the other player's Chats list and opens the tie on its Chat Room tab. Spectators have no chat 🅹 🅼 |
| 6.10j | The ladder enters playoffs | The How to Play button becomes a gold "How to play playoffs" with a trophy, with white text on a dark gold gradient, a bright gold border, trophy and glow, gently pulsing until opened once (remembered per ladder on the device), then still with a softer glow. It opens the playoff guide: Welcome to the Playoffs, the playoffs structure (page 2), the Prize Distribution table for this ladder (page 3: every paid place with cash each on paid ladders and CP each), Home and Away, Arrange Your Home Match, Win on Aggregate, Ten Days to Finish, and Winning the Final 🅹 🅼 |
| 6.11 | A match is arranged | Its placeholder becomes the normal match card, without the court-fee tag or the "Best of" tag (shown once in the box above); the deciding game's card keeps "Best of 1" 🅹 🅼 |
| 6.11a | The tie screen is loading | The skeleton has the page's shape: title bar with back button, the prize banner, the tabs, the aggregate bar, the two info boxes and two match sections 🅹 |
| 6.12 | Games reported in both matches | Aggregate card totals games won across both (for example 2 – 1) 🅹 🅼 |
| 6.13 | Report, approve and dispute a playoff game while the ladder is in playoffs | Allowed; the game scores the global profile only; ladder standings unchanged 🅹 🅴 🅼 |
| 6.14 | Same actions on a regular ladder match during playoffs | Still frozen (section 2 of the reliability plan) 🅹 🅼 |
| 6.15 | Both matches complete, aggregate level | One checked-in best-of-1 decider at the court of whichever match was played last; both sides notified 🅴 🅼 |
| 6.16 | Both matches complete, one side ahead | Winner goes through; the next-round game fills; both semi winners open the Final; "Congratulations! You've reached the …" sent 🅴 |
| 6.17 | Deadline passes with games played | Decided on games, then points, then rank; outcome "deadline" 🅴 |
| 6.18 | Deadline passes with nothing played | Void; the next-round opponent goes through on a walkover; voids chain up the bracket 🅴 |
| 6.19 | Day 3, 6, 9 | One reminder each ("N days left to finish your …"), never repeated 🅴 |
| 6.20 | Posted playoff matches | Not listed in Matchmaking 🅹 |
| 6.21 | Settled game | A gold winner card above the aggregate: "Winner", the winner's name, and "Through to the {next round}" ("on a walkover" when it was one; "Ladder champion" for the Final, "Takes 3rd place" for the 3rd-place tie). A void game shows a grey card "Not played in time, so neither side goes through." 🅹 🅼 |

Emulator cases are in `functions/src/ladderPlayoffTies.emulator.test.ts` and
`functions/src/autoApproveLadderGames.emulator.test.ts`; the screen in
`screens/Home/Ladders/PlayoffMatchDetails.test.tsx`; the rules in the shared
`ladderPlayoffMatches.test.js`.

## Not covered

- The bracket glow animation and the loading skeleton in Maestro (they last
  milliseconds); both are covered in Jest.
- Phase 3 (payout).
- In Maestro: the location check itself (the opponent's arrival is seeded
  instead), the "new" state of the gold guide button on a device that has
  already opened it (Jest covers it), and the 10-day deadline expiring (the
  emulator suite covers it).
- A push actually arriving on a physical phone, and the deployed Cloud
  Scheduler job firing in production. The tests assert the exact Expo request
  the function sends and the schedule it declares; delivery by Expo and
  Apple/Google is outside what can be asserted automatically.

## Fixtures

`maestro/seeds/seedLadderPlayoffs.js`: one singles ladder `maestro-po-ladder`
("Maestro Playoffs `<size>`") sized 2048 down to 127, and one doubles ladder
`maestro-po-doubles-ladder` ("Maestro Playoffs Doubles `<teams>`") of 256 or 128
teams, past their playoff start with home courts cycling through 8 UK cities.
Variants: `notQualified` (the test user ranked just below the cutoff),
`upcoming` (playoff start in three days) and `cancelled` (127 registrations,
status Cancelled, reason "Too few registrations", no ties). Generated seeds
write the promotion notification (or, for `notQualified`, the elimination
notice) and the cancelled seed writes the cancellation notification, each
exactly as the function would; every seed also writes a
neutral "Maestro: open `<ladder>` on `<tab>`" notification per tab to reach the
ladder. `cleanupLadderTestData` deletes the ladders, fixture users, courts and
notifications.

## Flows

| Flow | Scenarios |
|------|-----------|
| `ladder-playoffs-cutoff-2048`, `-1024`, `-512`, `-256`, `-128`, `-255`, `-511`, `-1023` | 1.1, 1.2 |
| `ladder-playoffs-doubles-cutoff-256`, `ladder-playoffs-doubles-cutoff-128` | 1.3, 1.4 |
| `ladder-playoffs-round-structure` | 2.1 |
| `ladder-playoffs-proximity-opponent` | 2.2 |
| `ladder-playoffs-bracket-view-toggle` | 2.3 |
| `ladder-playoffs-tap-game-opens-match` | 2.4 |
| `ladder-playoffs-promotion-notification` | 3.1 |
| `ladder-playoffs-open-from-playoffs-tab` | 3.2 |
| `ladder-playoffs-open-from-schedule-placeholder` | 3.3 |
| `ladder-playoffs-not-qualified` | 3.4 |
| `ladder-playoffs-not-started` | 4.1 |
| `ladder-playoffs-summary-status` | 4.2 |
| `ladder-playoffs-cancellation-notification` | 4.3 |
| `ladder-playoffs-summary-2048` | 4.4 |
| `ladder-playoffs-standings-player-details` | 4.5 |

### Phase 2 flows

Every flow runs on both seeded ladders where the wording differs (free
`maestro-po-ladder` and paid `maestro-po-paid-ladder`, £20 entry); journey
flows run the same steps on each in turn. The opponent is a harness mock
(`maestro/seeds/mockPlayoffOpponent.js`); ties are settled by the real
`onLadderMatchStatusChange` trigger when the test user approves the last reported
game, and the other tie in the round is finished by `mockFinishCompanionTie`.

| Flow | Scenarios |
|------|-----------|
| `ladder-playoffs-journey-arrange` | 6.1, 6.5, 6.6, 6.6a, 6.10, 6.31: "You made the playoffs!" opens the Playoffs tab on the user's tie, the tie lobby and prize card, the opponent arranges match 1 (arranged notification), the user accepts, arranges match 2, the opponent accepts |
| `ladder-playoffs-journey-play-here`, `-play-here-offered` | 6.6b: the user offers "Play match 2 here" at the opponent's court and the opponent accepts; the opponent offers and the user accepts |
| `ladder-playoffs-journey-decider` | 6.15, 6.33d: level on aggregate creates the checked-in decider, then Reschedule |
| `ladder-playoffs-auto-accept` | 6.33e: a posted match 25 hours old is accepted by the scheduled job (waits up to 25 minutes for it) |
| `ladder-playoffs-journey-extension` | 6.15: Request Extension on the decider |
| `ladder-playoffs-journey-r16-win`, `-qf-win`, `-sf-win`, `-decider-win` | 6.32, 6.33: "You're through to the {round}", then "Your {round} is ready" |
| `ladder-playoffs-journey-r16-loss`, `-decider-loss` | 6.33b: "Knocked out in the Round of 16", no prize sentence |
| `ladder-playoffs-journey-qf-loss` | 6.33b: "Knocked out in the Quarter-Final" with "You've been awarded £320 and 800 CP, paid when the playoffs finish." (paid) or "800 CP" (free) |
| `ladder-playoffs-journey-sf-loss` | 6.33a: "You'll play for 3rd place", then "Your 3rd-place tie is ready" |
| `ladder-playoffs-journey-final-win`, `-final-loss`, `-third-win`, `-third-loss` | 6.33c: each of the four players gets "Congratulations, you have placed {1st–4th} in {ladder} and been awarded …", the notification opens Summary, and the ladder shows Completed |
| `ladder-playoffs-tie-layout-spectator` | 6.10f, 6.10i |
| `ladder-playoffs-hosting-by-rank` | 6.6, 6.6a |
| `ladder-playoffs-prize-banner` | 6.1, 6.31 |
| `ladder-playoffs-tie-chat` | 6.10i |
| `ladder-playoffs-match-has-no-chat` | 6.10i |
| `ladder-playoffs-arrange-home` | 6.5, 6.10e |
| `ladder-playoffs-arrange-without-home-court` | 6.7 |
| `ladder-playoffs-confirm-match`, `-decline-match`, `-decline-limit` | 6.10, 6.10a |
| `ladder-playoffs-cancel-posted`, `-cancel-accepted` | 6.10b, 6.10c |
| `ladder-playoffs-reschedule`, `-extension` | 6.10 (Match Options), 6.15 |
| `ladder-playoffs-aggregate`, `-settled`, `-spectator-scores`, `-spectator-live` | 6.10g, 6.12, 6.21 |
| `ladder-playoffs-not-in-matchmaking` | 6.20 |
| `ladder-playoffs-report-during-playoffs`, `-approve-during-playoffs`, `-report-score` | 6.13, 6.14 |
| `ladder-playoffs-notifications-open-playoffs` | 6.10d |
| `ladder-playoffs-guide-button`, `-guide-pages` | 6.10j |
| `ladder-playoffs-through-and-ready` | 6.32, 6.33 |
| `ladder-playoffs-tie-wording` | 6.34 |
| `ladder-summary-prize-pool`, `ladder-join-fee-on-top`, `ladder-join-payment-stub`, `ladder-match-lobby-address`, `ladder-post-match-court-time` | Prize pool, entry fee on top, address, court-time hint |
| `ladder-posting-closes-7-days`, `ladder-results-closing-banner`, `ladder-results-closed` | 7.1, 7.2, 7.2a |
| `ladder-no-show-opponent-arrived` | 8.4 |

### Prizes

| # | Scenario | Expected |
|---|----------|----------|
| 6.30 | Any ladder size | Cash follows the payout bands for that size from the full pool (every entry fee; the 10% platform fee is paid on top, not taken from it), each band split equally; CP uses the same bands and shares on the CP pool (50 CP per entrant). The Summary tab's top four use the same shares 🅹 |
| 6.31 | The tie's prize card | "Current payout" is the prize for the worst place a loser of this round can finish; the right-hand payout is the prize for the round after (Champion for the Final, 3rd place for the 3rd-place tie) 🅹 🅼 |

### Moving on

| # | Scenario | Expected |
|---|----------|----------|
| 6.32 | A tie is won while the neighbouring tie is still being played | Straight away (on the match that completes it, not the scheduled job) the winner is placed in the next tie and gets "Congratulations, you're through to the {round}!": "You're through to the {round} in {ladder}! We'll let you know as soon as your opponent is decided." Semi-final losers going to the 3rd-place tie get "You'll play for 3rd place" instead 🅴 |
| 6.33 | The neighbouring tie then finishes | The next tie starts (`LADDER_PLAYOFF_TIE_DAYS` days, 10 today). The side that was waiting gets "Your {round} opponent is decided": "Your {round} against {opponent} is ready! You have N days to complete both matches". The side that just finished (and so never got the "through" notice) gets "Congratulations, you're through to the {round}!": "Congratulations! You've made it to the {round} in {ladder}. You have N days to play your matches." 🅴 |
| 6.33a | A Semi-Final is lost | The loser goes to the 3rd-place tie: "You'll play for 3rd place" ("Your Semi-Final in {ladder} is over, and you'll play for 3rd place. We'll let you know as soon as your opponent is decided."). Once both are known the side that just arrived gets "You'll play for 3rd place": "Your Semi-Final in {ladder} is over, and you'll play for 3rd place against {opponent}. You have N days to complete both matches", and the side that was waiting gets "Your 3rd-place tie opponent is decided": "Your Semi-Final in {ladder} is over, and your 3rd-place tie against {opponent} is ready! You have N days to complete both matches". No knock-out notification 🅴 |
| 6.33b | A tie is lost before the Semi-Finals | "Knocked out in the {round}": "You've been knocked out in the {round} of {ladder}." plus " You've been awarded £X and X CP, paid when the playoffs finish." only when that finish pays something (CP only on a free ladder) 🅴 |
| 6.33c | The Final and the 3rd-place tie finish | Each player gets "You placed {1st/2nd/3rd/4th}": "Congratulations, you have placed {place} in {ladder} and been awarded £X and X CP." (the prize part only when something was won); it opens Summary. Once both are finished the ladder becomes Completed (`playoffsCompletedAt`) and the payout is logged for Phase 3 🅴 |
| 6.33d | Both matches complete, aggregate level | "You have a deciding game left to play": "You have a deciding game left to play as your matches in the {round} of {ladder} resulted in a draw!" 🅴 |
| 6.33e | The away side hasn't answered a posted playoff match `LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS` (24 today) after it was arranged (checked every 15 minutes by `processLadderPhases`) | The match is accepted for them (`autoAccepted: true`, the decline count unchanged). The away side gets "You didn't reply within 24 hours, so playoff match N at {court}, {date} has been accepted for you." and the host "Your opponent didn't reply within 24 hours, so playoff match N at {court}, {date} has been accepted for them." A "play now" offer is never accepted for anyone, and nothing happens once the tie is over. Arranging again (after a decline) starts a new 24 hours 🅴 🅼 |
| 6.34 | Wording | A playoff pairing is a "tie" everywhere ("Round of 16 · Tie 3", "3rd-place tie", "Each playoff tie is two matches", "This tie must be finished by …", "Playoff tie not played", "Only the players in this tie can see this chat"); "game" means a single game, and notifications say "home and away matches" 🅹 🅼 |

## 7. Before the playoffs: season close

P is the playoff start (`playoffStartsAt`). Deadlines come from `courtchamps-shared/src/helpers/ladderSeasonClose.ts`.

| # | Scenario | Expected |
|---|----------|----------|
| 7.1 | Posting | Matchmaking closes and Post a Match's date picker stops at P − 7 days ("Matches must be scheduled at least 7 days before playoffs begin.") 🅹 🅼 |
| 7.2 | Reporting a game on a regular match after P − 5 days | Tapping the next game opens "Ladder results have closed" (the dates results closed and playoffs start) instead of the score form; the server also refuses with "Ladder results have closed ahead of the playoffs." Approving, disputing and playoff matches still work 🅹 🅼 |
| 7.2a | A player's accepted regular match between P − 7 and P − 5 days | The lobby shows "Ladder results close in {Nd Nh}. Finish and report your games before then.", ticking each minute; after P − 5 "Ladder results have closed for the playoffs. Games already reported can still be approved." Spectators don't see it 🅹 🅼 |
| 7.3 | Reporting a no-show on a regular match after P − 5 days | Refused with the same message 🅹 |
| 7.4 | Extension on a regular match | Once per match, ending at P − 5 days at the latest; the modal says "It ends early if ladder results close for the playoffs before then." 🅹 |
| 7.5 | P − 5 days, accepted regular match with nothing left to settle | Expires (approved games keep their CP); one with a game awaiting approval, an open dispute or a no-show claim waits for the close-out 🅢 🅴 |
| 7.6 | P − 1 day: close-out (`finaliseLadderStandings`) | Open disputes are discarded (the game becomes `discarded`, nobody scores it) and players are told; each match's no-show claims are settled: walkover only if one side claimed, the claimant has an arrival at the court for the match, nobody on the other side does, and the claimant isn't flagged (an admin-rejected claim before, or 3+ claims in the ladder); otherwise every claim is closed by the system with no walkover. Remaining accepted regular matches expire. `standingsFinalisedAt` is set once 🅴 |
| 7.7 | P | Playoffs generate on the day with no hold. If the close-out was missed it runs first 🅴 |
| 7.8 | Admin site after P − 1 | Report approve, reject and revert and every dispute action refuse with "This ladder's standings are final for the playoffs, so this can no longer be decided."; the queue shows "Decide by …" before that, and "Standings final — closed automatically" after (website tests) |

## 8. Arrivals and no-shows

| # | Scenario | Expected |
|---|----------|----------|
| 8.1 | Location check passes at check-in | The app sends the reading to `recordLadderArrival`, which records `arrivals.{userId}` (server time, distance, accuracy) 🅴 |
| 8.2 | Mocked (Android), stale (> 1 min), inaccurate (> 100 m) or distant (> 500 m) reading | Refused and nothing recorded; at check-in the verifier shows the reason (e.g. "Your location is coming from a mock-location app…") 🅴 🅹 |
| 8.3 | Pressing "Report no-show" | A fresh location check first ("Confirming you're at the court…"); away from the court: "You need to be at {court} to report a no-show." 🅹 🅼 |
| 8.4 | The opponent has an arrival for this match (from 30 minutes before the start) | The button reads "Your opponent has arrived" and is disabled, with "You can't report a no-show because your opponent has arrived at {court}…" 🅹 🅼 |
| 8.5 | Admin queue, no-show report | Shows "Arrivals: reporter at the court HH:MM (Nm) · reported player arrived / not recorded" |
