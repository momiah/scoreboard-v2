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
| Core harness | `core-harness-unlock-and-sign-out` | `maestro/sections/core.tsx` (`maestro-sign-out`), `maestro-cleanup-test-data` |
| Round-robin tournaments (singles and doubles) | `tournament-rr-report-approve-*` (create Private, invite, fixture users accept, generate on two courts, each round: test user reports and the opponent approves, or the opponent reports and the test user approves from the notification; report notification only to opponents; Player/Team Performance and every entrant's global profile exact after each round; completion, prize notification, prize CP and placement on profiles), `tournament-rr-bulk-publish-*` (Bulk Publish Fixtures, then the same checks), `tournament-rr-replay-*` (reverse-order approvals still give the fixture-order replay), `tournament-rr-fixture-fairness-*` (every pair once, even sit-outs and courts), `tournament-rr-team-selection-doubles` (Random, Balanced, Fixed teams), `tournament-rr-delete-regenerate-*` (delete and regenerate from the empty tab, inviting blocked after generation, delete refused once a game is approved), `tournament-rr-member-view-*` (member sees the organiser message, no Generate Fixtures), `tournament-rr-odd-entrants` (odd singles refused; three doubles teams with one sit-out each, played to completion) | `maestro/sections/tournaments.tsx`, `maestro/seeds/tournaments/roundRobin.js` (scenarios, fixture users `maestrorrs*` / `maestrorrd*`, test user profile snapshot restored by cleanup), `maestro/seeds/competitions/fixtureActions.ts` |

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
