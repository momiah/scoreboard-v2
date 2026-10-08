# Ladder Playoffs (Phase 1) — Test Plan

Scenarios for ladder playoff **bracket generation, the Playoffs tab, the
Summary status stat, the Schedule placeholder and the cancellation / promotion
notifications**, with the expected outcome for each. Layers:

- **Jest** — the seed fixtures (exact qualifiers per tier, pinned games,
  notifications, variants), the bracket component and the function. Marked 🅹.
- **E2E** (Maestro) — real journeys on the iOS simulator. Marked 🅼.
- **Emulator** — the real `processLadderPhases` function against a Firestore
  emulator (`npm --prefix functions run test:emulator`). Marked 🅴.

Phase 2 (the playoff match screen, aggregate scoring, scheduling) and Phase 3
(payout) are not covered; see `docs/ladder-playoffs-phase2-notes.md`.

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
    You've made the playoffs in {ladder}. You have 10 days to play both your
    home and away games."
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
| 2.4 | Tapping a bracket game | Nothing happens (no navigation, no modal). Update when Phase 2 adds the playoff match screen 🅼 |
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

## Not covered

- The bracket glow animation and the loading skeleton in Maestro (they last
  milliseconds); both are covered in Jest.
- Phase 2 (playoff match screen, aggregate scoring, scheduling, result
  notifications) and Phase 3 (payout).
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
| `ladder-playoffs-tap-game-does-nothing` | 2.4 |
| `ladder-playoffs-promotion-notification` | 3.1 |
| `ladder-playoffs-open-from-playoffs-tab` | 3.2 |
| `ladder-playoffs-open-from-schedule-placeholder` | 3.3 |
| `ladder-playoffs-not-qualified` | 3.4 |
| `ladder-playoffs-not-started` | 4.1 |
| `ladder-playoffs-summary-status` | 4.2 |
| `ladder-playoffs-cancellation-notification` | 4.3 |
| `ladder-playoffs-summary-2048` | 4.4 |
| `ladder-playoffs-standings-player-details` | 4.5 |
