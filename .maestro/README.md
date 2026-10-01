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

## Running

Export the test credentials, then run a flow (or the whole suite) against a
booted simulator with the dev client installed:

```bash
set -a && source .maestro/.env && set +a
maestro test .maestro/flows/reject-decline-opens-dispute.yaml   # one flow
maestro test .maestro/flows                                     # whole suite
```

Each flow's `onFlowStart` seeds nothing itself — the composer/timeline flows
tap the **Seed Reject-Game Flow** button on the Home screen first (a
temporary `devFunctions/seedRejectGameFlow.js` helper) to get a freshly
reported ladder game + notification to act on. Re-running the seed resets
game 1 and clears any dispute from a previous run, so flows are safe to
re-run back to back.

## Test-only Home-screen buttons

The seed/mock-resolve/mock-request-evidence/cleanup buttons these flows tap
are gated behind `__DEV__` in `screens/Home/Home.tsx`, so they only render in
a dev-client build (never in a production/release build) — tap
**Delete Reject-Flow Test Data** (`devFunctions/cleanupRejectFlowTestData.js`)
to remove every ladder/match/dispute/fixture-user doc these flows create.

## Known limitation: native pickers

The video-evidence picker (`expo-image-picker` → iOS `PHPickerViewController`)
runs out-of-process via ExtensionKit — it opens fine, but Maestro's
accessibility tree can't see or tap into it at all. Any scenario that needs a
specific video/photo selected from the library isn't Maestro-testable on iOS;
see `docs/testing/reject-game-flow-test-plan.md` scenario 2.8 for the case
this ruled out (covered by a Jest test on the guard function instead).

## CI

Not wired up yet — see `docs/testing/maestro.md`.
