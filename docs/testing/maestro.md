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
| Chats tab | `chats-tab-*` | `maestro-seed-chats-*` in `maestro/sections/ladders.tsx` (`seedChatsTab` uses the ladder cancellation seed) |
| Core harness | `core-harness-unlock-and-sign-out` | `maestro/sections/core.tsx` (`maestro-sign-out`), `maestro-cleanup-test-data` |
| Android status bar | `core-android-status-bar-inset` (Home, Competitions, Chats, Profile, Login and sign-up Back/Skip headers sit below the status bar) | `maestro-sign-out` |
| Free-ladder location check (join) | `join-ladder-singles-out-of-area-blocked-then-near-joins` (refused in Manchester with the radius from `maestro-expected-joinRadiusMiles`, then joins at the court); `ladder-join-payment-stub` (paid ladders show no rule); every free-ladder join flow runs `utilities/ladders/near-eligibility-court.yaml` | `maestro-seed-join-singles-*` etc. list `maestro-eligibility-court` (`maestro/seeds/ladderEligibilityFixtures.js`); `maestro-cleanup-ladder-test-data` deletes the court and the test user's `ladderEligibility` docs. Android emulators are put at the court by `run-suite.sh`. |
| Free-ladder inactivity removal | `ladder-inactivity-warning-notification` (the 3-day warning opens Matchmaking while the user is still in), `ladder-inactivity-removed-notification` (the removal notice opens a Summary that shows Registration Closed, not Participant). The scheduled job itself (who is warned and when, removal of singles and doubles, cancelled open matches, paid ladders untouched) is covered by `functions/src/ladderInactivity.emulator.test.ts`. | `maestro-seed-inactivity-warning` / `-removed` in `maestro/sections/ladders.tsx` (`maestro/seeds/seedLadderInactivity.js`, copy from the shared `getLadderInactivityWarning` / `getLadderInactivityRemoval`); `maestro-cleanup-ladder-test-data` |

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
