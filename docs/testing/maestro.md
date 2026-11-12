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
| Ladder pre-registration | `prereg-banner-*` (1–4), `prereg-list-*` (5–8), `prereg-signup-pool-and-table` (9), `prereg-guide-*` (10; also checks the How to Play title and close button sit below the Android status bar), `prereg-pre-register-and-leave` (11), `prereg-signed-out-pre-register` (12), `prereg-share` (13), `prereg-rules-and-terms` (13b; the Rules and Terms titles sit below the Android status bar), `prereg-deep-link-join` / `-preview` (14a), `prereg-deep-link-not-open` (14b), `prereg-launch-notification` (18, slow: needs the scheduled job) | `maestro/sections/preRegistration.tsx`, `maestro/seeds/preRegistration/*`; flows that close the live pre-registrations restore them in `onFlowComplete` |
| Sign-up and sign-in | `signup-new-account` (15: through the welcome screen and the "verify your email" log-in refusal), `signup-field-errors` (16; its Back tap also checks the sign-up header sits below the Android status bar), `signup-log-in-from-intro` (17). Home shows Sign In only once the saved session has loaded, so a signed-in user never sees it flash | `maestro/sections/signup.tsx`; each run's account is `maestro-signup-<stamp>@example.com`, and `maestro-cleanup-signup-profiles` removes its profile doc. Its Auth account stays unverified and can't be deleted from the app |
| Core harness | `core-harness-unlock-and-sign-out` | `maestro/sections/core.tsx` (`maestro-sign-out`), `maestro-cleanup-test-data` |
| Clubs: create | `clubs-create`: the test user creates a club in `AddClubModal`; the club page shows the owner, one member and the creation in the feed; the club is in the Clubs list and on Home | `maestro/sections/clubs.tsx` (`maestro-clubs-reset`, `maestro-clubs-cleanup`), `maestro/seeds/clubs/seedClubs.ts` |
| Clubs: invites and join requests | `clubs-invite-and-requests`: the test user invites two fixture users from `InvitePlayer`; one accepts, one declines (no invite left pending); two fixture users request to join and the owner accepts one and declines the other in `ClubPendingRequests` (handled requests leave the list); member count and the feed's joined events follow | `maestro-clubs-seed-owned-empty`, `maestro-clubs-respond-and-request` (fixture users act through `acceptClubInvite`, `declineClubInvite`, `requestToJoinClub`) |
| Clubs: roles and settings | `clubs-roles-and-settings`: the owner sees every settings action; assigns, revokes and re-assigns an admin; removes a member with a reason (exactly one removal notice); edits the description, which shows on Summary | `maestro-clubs-seed-owned-members`, `maestro-clubs-count-nia-removal-notices` |
| Clubs: joining as a member | `clubs-join-as-user`: a non-member sees no admin controls and requests to join; the fixture owner accepts through `acceptClubJoinRequest`; the test user is a participant, still without admin controls, and the joined event is in the feed | `maestro-clubs-seed-fixture-club`, `maestro-clubs-olive-accepts-test-user` |
| Clubs: delete | `clubs-delete`: a wrong password keeps the club; the right one deletes it, returns Home, and the club is gone from Home and the Clubs list | `maestro-clubs-seed-owned-members` |
| Clubs: competition won | `clubs-competition-won`: a round-robin tournament inside the test user's club (seeded with the round-robin seeder's `clubId` option; its entrants join the club by invite) shows in the club's Tournaments tab and its creation in the feed; fixture users play it to completion; the club feed then shows the winner the deployed prize function wrote (`writeClubCompetitionWon`), with the name and tournament computed by the seed from the shared prize helpers | `maestro-clubs-seed-tournament`, `maestro-clubs-play-tournament` |
| Round-robin tournaments (singles and doubles) | `tournament-rr-report-approve-*` (create Private, invite, fixture users accept, generate on two courts, each round: test user reports and the opponent approves, or the opponent reports and the test user approves from the notification; report notification only to opponents; Player/Team Performance and every entrant's global profile exact after each round; completion, prize notification, prize CP and placement on profiles), `tournament-rr-bulk-publish-*` (Bulk Publish Fixtures, then the same checks), `tournament-rr-replay-*` (reverse-order approvals still give the fixture-order replay; the seed's finishing order makes the result logs differ by approval order, which Jest checks for both scenarios), `tournament-rr-fixture-fairness-*` (every pair once, even sit-outs and courts), `tournament-rr-team-selection-doubles` (Random, Balanced, Fixed teams), `tournament-rr-delete-regenerate-*` (delete and regenerate from the empty tab, inviting blocked after generation, delete refused once a game is approved), `tournament-rr-member-view-*` (member sees the organiser message, no Generate Fixtures), `tournament-rr-odd-entrants` (odd singles refused; three doubles teams with one sit-out each, played to completion in reverse order: standings, the 0-win team unplaced, prizes, and profiles whose game CP follows the approval order, as `approveCompetitionGame` applies it) | `maestro/sections/tournaments.tsx`, `maestro/seeds/tournaments/roundRobin.js` (scenarios, fixture users `maestrorrs*` / `maestrorrd*`, test user profile snapshot restored by cleanup), `maestro/seeds/competitions/fixtureActions.ts` |
| Knockout tournaments (singles and doubles) | `tournament-ko-report-approve-*` (create a Private knockout, invite, fixture users accept, generate the brackets on two courts; semi-finals then the final and 3rd/4th playoff, each round with the test user reporting and the opponent approving or the opponent reporting and the test user approving from the notification; report notification only to opponents; the stored bracket is fully advanced, winners in the final and losers in the playoff, and the test user's next game shows on the Brackets tab; Player/Team Performance and every entrant's global profile exact after each round; completion, prize notification ("You have placed 1st", "Your team has placed 3rd"), prize CP and placement on profiles), `tournament-ko-bulk-publish-*` (Bulk Publish Brackets one round at a time, only games with both sides known, then the same checks), `tournament-ko-gates` (admin sees Generate Brackets, inviting blocked once generated), `tournament-ko-member-view` (member sees the organiser message, no Generate Brackets, no menu), `tournament-ko-invalid-entrants` (no byes: odd count, 6 singles players and 3 doubles teams refused) | `maestro/sections/tournaments.tsx` (`maestro-rr-check-bracket`), `maestro/seeds/tournaments/roundRobin.js` (`ko*` scenarios: `mode: "Knockout"`, `userFirst` finishing order, `checkBracket`, `openGames`) |
| Bulk publish on Android | `tournament-rr-bulk-publish-*`, `tournament-ko-bulk-publish-*` on the Android emulator: when the number pad opens, the list pads by the keyboard height (`useAndroidKeyboardHeight`) and scrolls the focused score above the pad, so every score, including the last games, is visible while it is typed | the bulk-publish seeds and cleanup above |
| League bulk publish (singles and doubles) | `league-bulk-publish-*`: the admin of a Private league (fixture users joined by invite through `acceptCompetitionInvite`) opens League Settings > Bulk Publish Games and enters every game in the Add Game card, picking each player and typing the score; the number pad stays open while Submit is tapped, so the card must sit above it (on Android `useAndroidKeyboardHeight` lifts it). Publishing stores every game, standings, doubles teams (each created by its first game) and profiles exactly as `applyLeagueGameResults` scores them; Player/Team Performance show the expected wins, PD and rank, and the test user's profile the expected CP, PD, wins and losses. Run on iOS and on the Android emulator | `maestro/sections/leagues.tsx` (`maestro-league-seed-bulkSingles` / `-bulkDoubles`, `maestro-league-expect`, `maestro-league-check-results`), `maestro/seeds/leagues/bulkPublish.js` (fixture users `maestrolgs*` / `maestrolgd*`, test user profile snapshot restored by cleanup) |
| Tournaments on Android | Every `tournament-*` flow, `chats-tournament-chat` and `notifications-inbox-paging` pass on the Android emulator (`MAESTRO_DEVICE=emulator-5554`). The shared utilities branch by platform where Android differs: row text joined with ", ", the native date dialog, no `hideKeyboard` (it presses Back), the name typed in parts so a debug build's double-R reload never fires, slow swipes in the bulk publish list, and the landing glow marker stays after its fade | the same seeds and cleanups as on iOS |
| Chats list | `chats-tournament-chat`: an opponent sends a message in the tournament's Chat Room; the Chats tab shows the tournament's name (not "Unknown League"), the message and an unread count, and tapping the row opens that tournament on its Chat Room and marks the chat read. An older message whose avatar is a bundled-image number (as messages from users without a profile image were saved) shows the default avatar instead of crashing the Chat Room on Android. The Chats screen, `helpers/chatDestination.ts` and `ChatRoom` are the ladder line's, so ladder chats (MatchDetails, PlayoffMatchDetails) and their flows arrive with it | `maestro-rr-seed-chatSingles`, `maestro-rr-opponent-sends-chat`; cleanup deletes the test user's chat summary with the tournament |
| Home video feed | `home-video-feed-load-window`: Home's Game Videos feed loads only the active video and its neighbours (`isInVideoLoadWindow`), and each player's forward buffer is capped. The feed list reports how many cards have a video loaded (`home-video-feed-loaded-N`): none before a video is on screen, and two or three while scrolling, never more. Before this every card buffered its whole video at once, which filled Android's Java heap within a minute of launch | none: runs on the live feed, which writes nothing |
| Notifications inbox | `notifications-inbox-paging`: the fixture club owner invites the test user to a club, then 120 newer club notifications arrive. The Competitions badge counts every unread notification (`99+`). The Notifications list opens on the newest 100 and loads older pages on scroll until the invite appears. Pending Invites shows the invite straight away from its own query, though it is outside the newest 100 | `maestro/sections/notifications.tsx` (`maestro-notifications-seed-inbox`, `maestro-notifications-cleanup`), `maestro/seeds/notifications/seedNotificationInbox.ts`; cleanup is the club cleanup, which deletes the inbox club and the test user's notifications about it |

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
