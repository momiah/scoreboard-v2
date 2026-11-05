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
| Sign-up and sign-in | `signup-new-account` (15: through the welcome screen and the "verify your email" log-in refusal), `signup-field-errors` (16), `signup-log-in-from-intro` (17) | `maestro/sections/signup.tsx`; each run's account is `maestro-signup-<stamp>@example.com`, and `maestro-cleanup-signup-profiles` removes its profile doc. Its Auth account stays unverified and can't be deleted from the app |
| Core harness | `core-harness-unlock-and-sign-out` | `maestro/sections/core.tsx` (`maestro-sign-out`), `maestro-cleanup-test-data` |
| Clubs: create | `clubs-create`: the test user creates a club in `AddClubModal`; the club page shows the owner, one member and the creation in the feed; the club is in the Clubs list and on Home | `maestro/sections/clubs.tsx` (`maestro-clubs-reset`, `maestro-clubs-cleanup`), `maestro/seeds/clubs/seedClubs.ts` |
| Clubs: invites and join requests | `clubs-invite-and-requests`: the test user invites two fixture users from `InvitePlayer`; one accepts, one declines (no invite left pending); two fixture users request to join and the owner accepts one and declines the other in `ClubPendingRequests` (handled requests leave the list); member count and the feed's joined events follow | `maestro-clubs-seed-owned-empty`, `maestro-clubs-respond-and-request` (fixture users act through `acceptClubInvite`, `declineClubInvite`, `requestToJoinClub`) |
| Clubs: roles and settings | `clubs-roles-and-settings`: the owner sees every settings action; assigns, revokes and re-assigns an admin; removes a member with a reason (exactly one removal notice); edits the description, which shows on Summary | `maestro-clubs-seed-owned-members`, `maestro-clubs-count-nia-removal-notices` |
| Clubs: joining as a member | `clubs-join-as-user`: a non-member sees no admin controls and requests to join; the fixture owner accepts through `acceptClubJoinRequest`; the test user is a participant, still without admin controls, and the joined event is in the feed | `maestro-clubs-seed-fixture-club`, `maestro-clubs-olive-accepts-test-user` |
| Clubs: delete | `clubs-delete`: a wrong password keeps the club; the right one deletes it, returns Home, and the club is gone from Home and the Clubs list | `maestro-clubs-seed-owned-members` |
| Clubs: competition won | `clubs-competition-won`: a round-robin tournament inside the test user's club (seeded with the round-robin seeder's `clubId` option; its entrants join the club by invite) shows in the club's Tournaments tab and its creation in the feed; fixture users play it to completion; the club feed then shows the winner the deployed prize function wrote (`writeClubCompetitionWon`), with the name and tournament computed by the seed from the shared prize helpers | `maestro-clubs-seed-tournament`, `maestro-clubs-play-tournament` |
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
