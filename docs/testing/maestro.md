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
| Clubs: create | `clubs-create`: the test user creates a club in `AddClubModal`; the club page shows the owner, one member and the creation in the feed; the club is in the Clubs list and on Home | `maestro/sections/clubs.tsx` (`maestro-clubs-reset`, `maestro-clubs-cleanup`), `maestro/seeds/clubs/seedClubs.ts` |
| Clubs: invites and join requests | `clubs-invite-and-requests`: the test user invites two fixture users from `InvitePlayer`; one accepts, one declines (no invite left pending); two fixture users request to join and the owner accepts one and declines the other in `ClubPendingRequests` (handled requests leave the list); member count and the feed's joined events follow | `maestro-clubs-seed-owned-empty`, `maestro-clubs-respond-and-request` (fixture users act through `acceptClubInvite`, `declineClubInvite`, `requestToJoinClub`) |

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
