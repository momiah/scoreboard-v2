# Maestro flows — reject-game (dispute)

E2E flows for the ladder reject-game/dispute journey, run against a dev-client
build on the iOS simulator. See [docs/testing/maestro.md](../docs/testing/maestro.md)
for install + build steps, and
[docs/testing/reject-game-flow-test-plan.md](../docs/testing/reject-game-flow-test-plan.md)
for the scenarios each flow covers.

## Layout

- `config.yaml` — workspace config (which files count as flows). `appId` and
  the login `onFlowStart` hook live in each flow file's own header, not here —
  Maestro doesn't support them at the workspace level.
- `login.yaml` — shared login subflow, invoked via `onFlowStart` from every
  flow below. Idempotent: skips itself if a session is already active.
- `flows/` — the reject-game/dispute flows.
- `utilities/` — flows that are not part of the suite (not matched by
  `config.yaml`), e.g. `cleanup-ladder-test-data.yaml`, which taps the Home
  cleanup button to delete all seeded Maestro fixtures. Run on request only.
- `.env` (gitignored) — the throwaway test account's credentials.

## One-time setup

1. Install Maestro and build the dev client — see `docs/testing/maestro.md`.
2. Create `.maestro/.env` (gitignored) with:
   ```
   MAESTRO_TEST_USER_EMAIL=...
   MAESTRO_TEST_USER_PASSWORD=...
   ```
   Maestro auto-passes any shell variable prefixed `MAESTRO_` into flows as
   `${VAR}`, so these just need to be exported before running — no `-e` flags
   needed.

> The harness is currently detached from Home (see `maestro/README.md`,
> "Re-attaching the harness"). Put it back before running any flow.

## Running

Export the test credentials, then run a flow (or the whole suite) against a
booted simulator with the dev client installed:

```bash
set -a && source .maestro/.env && set +a
export MAESTRO_PLAYOFF_TIE_DAYS=$(node -p "require('courtchamps-shared').LADDER_PLAYOFF_TIE_DAYS")
export MAESTRO_LADDER_HOST_ARRANGE_HOURS=$(node -p "require('courtchamps-shared').LADDER_PLAYOFF_HOST_ARRANGE_HOURS")
export MAESTRO_LADDER_AUTO_ACCEPT_HOURS=$(node -p "require('courtchamps-shared').LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS")
maestro test .maestro/flows/reject-decline-opens-dispute.yaml   # one flow
maestro test .maestro/flows                                     # whole suite
.maestro/run-suite.sh                                           # whole suite, retrying a failed flow once
.maestro/run-suite.sh team-                                     # only flows whose name contains "team-"
```

`run-suite.sh` runs the flows one at a time (Maestro cannot share a simulator),
retries a failed flow once, and prints `FLAKY` for one that passed on the retry
and `FAIL` only for one that fails twice. Use it for full runs: a long run
occasionally loses a login or a wait to simulator timing.

Each flow's `onFlowStart` seeds nothing itself — the composer/timeline flows
tap the **Seed Reject-Game Flow** button on the Home screen first (a
`maestro/seeds/seedRejectGameFlow.js` helper) to get a freshly
reported ladder game + notification to act on. Re-running the seed resets
game 1 and clears any dispute from a previous run, so flows are safe to
re-run back to back.

## Test-only Home-screen buttons

The seed/mock-resolve/mock-request-evidence/cleanup buttons these flows tap
live in `maestro/MaestroHarness.tsx` and the helpers in `maestro/seeds/`. Home
loads the harness through a `require` guarded by `__DEV__`, so it renders in a
dev-client build and is not included in a production/release build. The
buttons stay hidden until a transparent strip (`maestro-harness-unlock`) is
tapped five times, which `login.yaml` does at the start of every flow. The
**Delete Ladder Test Data** button (`maestro/seeds/cleanupLadderTestData.js`)
removes every ladder/match/dispute/fixture-user doc any of these flows create
(reject-game and add-game both). See [maestro/README.md](../maestro/README.md).

## Known limitation: native pickers

The video-evidence picker (`expo-image-picker` → iOS `PHPickerViewController`)
runs out-of-process via ExtensionKit — it opens fine, but Maestro's
accessibility tree can't see or tap into it at all. Any scenario that needs a
specific video/photo selected from the library isn't Maestro-testable on iOS;
see `docs/testing/reject-game-flow-test-plan.md` scenario 2.8 for the case
this ruled out (covered by a Jest test on the guard function instead).

## CI

Not wired up yet — see `docs/testing/maestro.md`.

## Android

Android is built from `android-build` (reanimated 3.19.5, pinned compressor and background-upload fork,
`patch-package`, native date picker), so run these flows from a branch cut from it
(`claude/ladder-playoffs-android`), never from a main-based checkout: that one doesn't compile natively.

```
cd android-worktree && npm ci && npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/debug/app-debug.apk   # an emulator wiped with -wipe-data has the space
MAESTRO_DEVICE=emulator-5554 .maestro/run-suite.sh <pattern>
```

- `run-suite.sh` re-applies `adb reverse tcp:8090 tcp:8090` before each flow and `login.yaml` taps the
  `http://localhost:8090` dev-client entry. Grant notification, location and camera permissions with `adb shell pm grant`.
- `utilities/playoffs/harness.yaml` scrolls the harness list on Android (off-screen buttons aren't in the
  accessibility tree); flows whose button sits far down on iOS use `harness-scrolled.yaml`.
- `utilities/pick-date.yaml` picks a date: iOS spinner plus "Confirm Date", Android native dialog and "OK".
  The native Android dialog has no range message, so flows that assert it do so on iOS only.
- Copy `.env` into a new worktree, or Firebase fails with `auth/invalid-api-key`.
