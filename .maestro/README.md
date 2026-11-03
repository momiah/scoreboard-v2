# Maestro flows

E2E flows run against a dev-client build on the iOS simulator (and Android).
See [docs/testing/maestro.md](../docs/testing/maestro.md) for install and build
steps and the list of flows, and [maestro/README.md](../maestro/README.md) for
the in-app harness, seeds and fixture users.

## Layout

- `config.yaml`: workspace config (which files count as flows). `appId` and
  the login `onFlowStart` hook live in each flow file's header; Maestro doesn't
  support them at the workspace level.
- `login.yaml`: shared login subflow, run from every flow's `onFlowStart`. It
  opens the dev client on `${MAESTRO_METRO_URL}`, signs in only if no one is,
  and taps the harness unlock five times.
- `flows/`: the suite, one YAML per scenario, named `<feature>-<behaviour>.yaml`.
- `utilities/`: subflows and run-on-request flows, not matched by
  `config.yaml`:
  - `harness.yaml` taps a harness button: filters to `${BUTTON}`, taps it and
    dismisses the "Seeded" / "Cleaned up" / "Signed out" alert.
  - `cleanup-test-data.yaml` runs every section's cleanup.
  - `pick-date.yaml` picks a date on iOS and Android.
  - `cleanup-ladder-test-data.yaml` runs only the ladder cleanup.
  - `playoffs/*` and `profile/*`: ladder subflows (`playoffs/harness.yaml`
    also scrolls the harness list on Android, where off-screen buttons aren't
    in the accessibility tree; flows whose button sits far down on iOS use
    `harness-scrolled.yaml`).
- `.env` (gitignored): the test account and this checkout's Metro port. Copy
  `.env.example` and fill it in.

## One-time setup

1. Install Maestro and build the dev client: see `docs/testing/maestro.md`.
2. Create `.maestro/.env` from `.env.example`:
   ```
   MAESTRO_TEST_USER_EMAIL=...
   MAESTRO_TEST_USER_PASSWORD=...
   MAESTRO_METRO_PORT=8081
   ```
   Use a different port per worktree, so each checkout runs its own Metro.
   Maestro passes any shell variable prefixed `MAESTRO_` into flows as `${VAR}`.

## Running

```bash
.maestro/run-suite.sh                    # whole suite, retrying a failed flow once
.maestro/run-suite.sh core-              # flows whose name contains "core-"
.maestro/run-suite.sh =core-harness-unlock-and-sign-out   # exactly that flow
MAESTRO_DEVICE=<udid> .maestro/run-suite.sh               # a specific device
```

`run-suite.sh` sources `.env`, exports `MAESTRO_METRO_URL` and the rule numbers
from `courtchamps-shared` (`MAESTRO_PLAYOFF_TIE_DAYS`,
`MAESTRO_LADDER_HOST_ARRANGE_HOURS`, `MAESTRO_LADDER_AUTO_ACCEPT_HOURS`), runs
the flows one at a time, retries a failed flow once, and prints `FLAKY` for one
that passed on the retry and `FAIL` only for one that failed twice. Logs go to
`/tmp/maestro-<flow>.log`. To run one flow with plain `maestro test`, export the
same variables first.

Each flow seeds what it needs by tapping its harness button through
`utilities/harness.yaml`; re-running a seed overwrites its fixtures, so flows are
safe to re-run back to back.

## Known limitation: native pickers

The iOS photo/video picker runs out of process, and Maestro cannot see or tap
into it. Cover a scenario that needs a specific library item with a Jest test on
the guard function instead.

## Android

Android builds from `android-build`, so run flows from a branch cut from it,
never from a main-based checkout: that one doesn't compile natively.

```
npm ci && npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/debug/app-debug.apk
MAESTRO_DEVICE=emulator-5554 .maestro/run-suite.sh <pattern>
```

- `run-suite.sh` re-applies `adb reverse` for `MAESTRO_METRO_PORT` before each
  flow. Grant notification, location and camera permissions with
  `adb shell pm grant`.
- `utilities/pick-date.yaml` handles the iOS spinner plus "Confirm Date" and
  the Android native dialog.
- Copy `.env` into a new worktree, or Firebase fails with `auth/invalid-api-key`.

## CI

Not wired up yet: see `docs/testing/maestro.md`.
