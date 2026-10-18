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

The flows run on an Android emulator with `MAESTRO_DEVICE=emulator-5554 .maestro/run-suite.sh <pattern>`
(`run-suite.sh` re-applies `adb reverse tcp:8090 tcp:8090` before each flow, and `login.yaml` taps the
`http://localhost:8090` dev-client entry). `utilities/playoffs/harness.yaml` scrolls the harness list on
Android, because off-screen buttons aren't in Android's accessibility tree.

Setup notes (June 2026): the repo's native Android build fails as it stands (reanimated 3.17.5 on RN 0.81,
`react-native-compressor` 1.19.2 references a missing function, `react-native-background-upload` uses the
removed `kotlin-android-extensions` plugin). A local debug build needs those patched in `node_modules`
(not committed) and `react-native-reanimated@3.19.5` installed with `--no-save` for both the native build
and Metro; restore 3.17.5 for iOS afterwards.

Known blocker: on Android 15+ (edge-to-edge) the Competitions header sits under the status bar, so the
notifications bell and the "+" button can't be tapped. Every playoff flow opens the tie through the
notifications screen, so none can run on Android until that is fixed.
