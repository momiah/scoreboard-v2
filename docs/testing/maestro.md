# Maestro E2E Testing

Maestro drives the real dev-client app on the iOS simulator (not Expo Go —
the app relies on custom native modules for video, blur, and the date
picker).

Every feature or behaviour change ships with its Maestro coverage in the same
PR: its flows, any seeds and harness section buttons with matching cleanup,
and a line in the table below. A PR without them isn't ready to merge.

## Flows

| Feature | Flows | Seeds / harness section |
|---|---|---|
| Ladders (reject-game, add/approve game, cancellation, check-in, home court, court submission, join, team, report player, freeze, info, playoffs, PROLevel) | `reject-*`, `add-game-*`, `approve-game-*`, `cancel-*`, `checkin-*`, `court-*`, `home-court-*`, `join-ladder-*`, `team-*`, `report-player-*`, `dispute-*`, `disqualified-*`, `ladder-*`, `match-chat-room-*`, `profile-prolevel-*`; test plans in `docs/testing/*-test-plan.md` | `maestro/sections/ladders.tsx`, `maestro/seeds/*`, `maestro-cleanup-ladder-test-data` |
| Ladder season start: matches closed until the season starts, the pre-season notice and countdown on Summary, the moved-back start, the season-started and cancelled-before-start notifications, How to Play and Rules copy | `ladder-season-*` | `maestro-seed-season-start-{pre-season,extended,started,cancelled}` in `maestro/sections/ladders.tsx` (`maestro/seeds/seedLadderSeasonStart.js`), removed by `maestro-cleanup-ladder-test-data` |
| Ladder double booking | `double-booking-accept-blocked-by-a-match-on-another-ladder` (accepting a singles match is refused while the player has a doubles match on another ladder inside the clash window), `double-booking-accept-allowed-when-the-other-match-is-later` (a match a full window later does not block). Posting, playoff arranging and rescheduling run the same check; the rule itself is unit-tested in `helpers/ladderMatchClash.test.js` and `context/LadderContext.test.tsx`. | `maestro-seed-double-booking-clash` / `-clear` in `maestro/sections/ladders.tsx` (`maestro/seeds/seedDoubleBookingFlow.js`, window from `LADDER_MATCH_CLASH_WINDOW_MINUTES`); `maestro-cleanup-ladder-test-data` |
| Ladder terms | `ladder-info-rules-and-terms-screens`: the ladder menu opens Rules and Terms, and the Terms show section 10, Chargebacks & payment disputes, followed by 11. Court fees | `maestro-seed-cancel-accepted`; `maestro-cleanup-ladder-test-data` |
| Chats tab | `chats-tab-*` | `maestro-seed-chats-*` in `maestro/sections/ladders.tsx` (`seedChatsTab` uses the ladder cancellation seed) |
| Core harness | `core-harness-unlock-and-sign-out` | `maestro/sections/core.tsx` (`maestro-sign-out`), `maestro-cleanup-test-data` |
| Free-ladder location check (join) | `join-ladder-singles-out-of-area-blocked-then-near-joins` (refused in Manchester with the radius from `maestro-expected-joinRadiusMiles`, then joins at the court); `ladder-join-payment-stub` (paid ladders show no rule); every free-ladder join flow runs `utilities/ladders/near-eligibility-court.yaml` | `maestro-seed-join-singles-*` etc. list `maestro-eligibility-court` (`maestro/seeds/ladderEligibilityFixtures.js`); `maestro-cleanup-ladder-test-data` deletes the court and the test user's `ladderEligibility` docs. Android emulators are put at the court by `run-suite.sh`. |
| Free-ladder inactivity removal | `ladder-inactivity-warning-notification` (the 3-day warning opens Matchmaking while the user is still in), `ladder-inactivity-removed-notification` (the removal notice, 14 days before registration closes, opens a Summary that shows Removed for inactivity instead of Join or Participant). The scheduled job itself (removal 14 days before close, warnings 7/3/1 days before that once the season has started, the 14-day grace for late joiners, removal of singles and doubles with their location checks, cancelled open matches, paid ladders untouched) and the join callable refusing removed players is covered by `functions/src/ladderInactivity.emulator.test.ts`. | `maestro-seed-inactivity-warning` / `-removed` in `maestro/sections/ladders.tsx` (`maestro/seeds/seedLadderInactivity.js`, copy from the shared `getLadderInactivityWarning` / `getLadderInactivityRemoval` / `LADDER_INACTIVITY_REMOVED_LABEL`); `maestro-cleanup-ladder-test-data` |

## Install

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME/.maestro/bin"   # add to ~/.zshrc if not already there
maestro --version
```

## Build the dev client

Maestro needs a real build to launch, not the Expo Go sandbox:

```bash
npx expo run:ios
```

This installs a dev-client build on the booted simulator. Note the bundle
id it builds under — the flows' `config.yaml` needs it as `appId`.

## Run flows

```bash
maestro test .maestro/flows/<file>.yaml   # one flow
maestro test .maestro/flows               # whole suite
```

See [.maestro/README.md](../../.maestro/README.md) for how login and seed
data are wired into these flows.

## CI (not set up yet)

These flows can run headless on Maestro Cloud or a macOS CI runner. Either
way the dev-client build (`npx expo run:ios`) is a prerequisite step before
`maestro test` can launch the app — there's no CI wiring for this yet.
