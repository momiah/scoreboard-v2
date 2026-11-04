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
| Ladder pre-registration | `prereg-banner-*` (1–4), `prereg-list-*` (5–8), `prereg-signup-pool-and-table` (9), `prereg-guide-*` (10), `prereg-pre-register-and-leave` (11), `prereg-signed-out-pre-register` (12), `prereg-share` (13), `prereg-rules-and-terms` (13b), `prereg-deep-link-join` / `-preview` (14a), `prereg-deep-link-not-open` (14b), `prereg-launch-notification` (18, slow: needs the scheduled job) | `maestro/sections/preRegistration.tsx`, `maestro/seeds/preRegistration/*`; flows that close the live pre-registrations restore them in `onFlowComplete` |
| Sign-up and sign-in | `signup-new-account` (15), `signup-field-errors` (16), `signup-log-in-from-intro` (17) | account in `maestro/fixtures/signupFixtures.js` / `MAESTRO_SIGNUP_*`, deleted through the app's Delete Account |
| Core harness | `core-harness-unlock-and-sign-out` | `maestro/sections/core.tsx` (`maestro-sign-out`), `maestro-cleanup-test-data` |

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
