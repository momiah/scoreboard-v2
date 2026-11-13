# Firestore access requirements

Client writes that Firestore security rules must keep allowing. Read this before
any security-rules work, and add a row whenever a feature adds a new client
write. Cloud Functions use the Admin SDK and bypass rules, so only app and
website (client SDK) writes belong here.

`firestore.rules` in this repo is the source of truth, tested by
`firestore-tests/` (see "Testing the rules" below). Rules must keep allowing
every write made by the app builds still in the stores, not just the current
code, so check old builds before tightening anything.

## Live clients

| Client | Code it runs |
|---|---|
| iOS 3.0.x (runtime `3.0.0`) | Latest production OTA for runtime 3.0.0 on iOS: `2bb92612` (31 Jul 2026) |
| Android 3.0.0–3.0.7 (runtime `3.0.0`) | Latest production OTA for runtime 3.0.0 on Android: `8d7ca8e0` (30 Apr 2026) |
| Android 3.0.8 (runtime `3.0.0`) | Embedded bundle, `b6c96bb9`; the 3.0.0 OTA above is older, so it is not applied |
| Android 3.0.9 (runtime `3.0.1`) | Embedded bundle, `bf61d82c`; its last OTA predates the build |
| iOS / Android 3.1.0 | `main` / `android-build` |
| Website | `courtchamps-website` `main`; admin pages are gated by `userRoles/{uid}` |

Find the code behind a runtime with `eas update:list --branch production --json`
and `eas update:view <group> --json` (`gitCommitHash`). 3.0.x builds do not use
`courtchamps-shared`; their copy lives in the app's `shared/` folder.

## Who is who

- **Staff**: a `userRoles/{uid}` doc with `role` `owner`, `admin` or
  `moderator` (the website gives all three the same pages). Staff can read and
  write everything. Maestro seeds and `devFunctions` backfills write other
  players' data, so they must run as a staff account.
- **Signed out**: the app opens on Home without signing in, and the website's
  share pages are signed out. Browse data stays publicly readable (see below).
- Cloud Functions use the Admin SDK and bypass rules.

## Public reads (signed out)

| Path | Reader | Why |
|---|---|---|
| `users/{userId}` | App (all builds) | Home's top players and All Players. 3.0.x sign-up queries `usernameLower` before the account exists (3.1.0 uses the `checkUsernameAvailable` callable). |
| `leagues`, `tournaments` | App, website `JoinPage` and competition list | Browse and share pages. |
| `clubs`, `clubs/*/participants`, `clubs/*/feed`, collection group `participants` | App | Browse; club stats query `participants` by `userId`. |
| `courts`, `scoreboard` | App | Court picker; legacy games list. |
| `gameVideos` and `comments` / `replies` | App feed, website `VideoPage` | Video feed and share page. |
| `ladderPreRegistrations` and `registrants` | App banner, website share page | Lists and the "+N more" count. |
| `ladders`, `ladderParticipants`, `ladderTeams`, `ladderMembers`, `ladderMatches`, `playoffTies`, `teams` | App, website | Ladder browsing and standings. |

## Profiles, notifications and chats

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `users/{userId}` | That player | create | Sign-up: doc ID = own uid, `userId` = own uid. `profileDetail.leagueStats` / `tournamentStats` / `ladderStats` all 0 or absent, `cashWon` 0 or absent (3.0.x schemas have no `ladderStats` / `cashWon`). |
| same | That player | update | Any field (profile edits, `pushTokens`), except the function-only stats below. |
| same | Any signed-in player | update | Only `profileDetail` (game approval and bulk fixture publishing rewrite the whole map for every player in the game, from a fresh read) and `profileViews` (+1 when opening a profile). |
| same | That player | delete | Account deletion, with their `notifications` and `chats`. |
| `users/{userId}/notifications/{id}` | Any signed-in player | create | Invites, requests, results, welcome. |
| same | That player | read, update, delete | `isRead`, `response`. Accepting or declining a request only updates the handler's own notification. |
| `users/{userId}/chats/{id}` | Any signed-in player | read, create, update | A sender reads and bumps each recipient's entry (`isRead`, `messageCount`, `lastMessage`). |
| same | That player | delete | Account deletion. |

Function-only on every profile: `profileDetail.cashWon`, `ladderStats`,
`leagueStats` and `tournamentStats` must come back unchanged on any client
update. No client code reads or writes them, and 3.0.x edits the fresh
`profileDetail` in place, so they survive its rewrites.

## Leagues, tournaments and clubs

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `leagues/{id}`, `tournaments/{id}`, `clubs/{id}` | Any signed-in player | create | `leagueOwner.userId` / `tournamentOwner.userId` / `clubOwner.userId` = own uid. |
| same | Any signed-in player | update | Joining, invites, requests, game reports and approvals, fixtures, admins, and club detach (`clubId: null`) all write here. The owner's `userId` must not change. |
| same | The owner | delete | Settings only shows Delete to the owner. |
| `leagues/*/chat`, `tournaments/*/chat`, `clubs/*/chat` | Any signed-in player | read, create | Competition chat. Club owner deletes club chat when deleting the club. |
| `clubs/{id}/participants/{uid}` | Any signed-in player | create, update, delete | Joining, admins adding/removing members, leaving, club deletion. |
| `clubs/{id}/feed/{id}` | Any signed-in player | create, update | Club events. Club owner deletes. |

## Videos, reports and support

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `gameVideos/{id}` | Any signed-in player | update | Only `likes`, `likedBy`, `commentCount`, `courtPositions`, `courtPositionsSetBy`, and `videoApproved: false` (deleting a game archives its video). Created and deleted by Cloud Functions. |
| `gameVideos/{id}/comments/{id}` and `/replies/{id}` | Any signed-in player | create, update | Comment, reply, `commentId` / `replyId`, likes, `replyCount`. |
| `savedVideos/{videoId}_{uid}` | That player | create, delete | `savedBy.userId` = own uid. |
| `pendingVideoUploads/{id}` | That player | create, read, update, delete | `postedBy.userId` = own uid. |
| `failedVideoUploads/{id}` | Any signed-in player | create | Diagnostics. |
| `reportedVideos/{id}` | Any signed-in player | create, read | `reportedBy.userId` = own uid, `status: "pending"`. The poster reads all reports on their video. |
| `videoReportAppeals/{id}` | That player | create, read | `appealedBy.userId` = own uid, `status: "pending"`. |
| `feedback`, `account-support` | Any signed-in player | create | Profile menu forms. |

## Ladder pre-registration

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladderPreRegistrations/{preRegistrationId}` | Anyone (app) | read | Only `status == "open"` documents are listed by the app (`where("status", "==", "open")`). |
| same | Admin (website, and the app's dev-only launch button) | create, update, delete | Any field: the advertised ladder details (`name`, `description`, `image`, `region`, `city`, `countryCode`, `ladderType`, `genderType`, `entryFee`, `currencyType`, `maxPlayers`, and for free ladders the optional `eligibilityRadiusMiles`), `status` (`open` / `closed` / `launched`), `expectedOpensAt`, `ladderId`, created/updated fields. "Create ladder from this" sets `status: "launched"` and `ladderId` in the same batch that creates the ladder. |
| `ladderPreRegistrations/{preRegistrationId}/registrants/{userId}` | That player (app) | create | Doc ID = own uid. Exactly `userId` = own uid, `username` and `profileImage` = own profile's, `createdAt` = server timestamp, `notifiedAt: null`. Only while the parent's `status` is `open`, and only when the player's `users/{uid}.location.countryCode` equals the parent's `countryCode` (`canPreRegisterForLadder`). No email: the documents are readable by other players. |
| same | That player (app) | delete | Own doc only ("Leave the list"). |
| same | Anyone (app, website) | read, count | The sign-up screen shows the latest 10 avatars and "+N more"; the website share page counts them signed out. |
| same | Admin (website) | read | All registrants, to count and export them (emails are read from `users/{uid}`). |
| `ladders/{ladderId}` | Admin (website ladder form, and the app's dev-only "Backfill ladder city" button) | create, update | `city`: the city shown on ladder cards with the country code, e.g. "London". |

Players must not be able to: write a pre-registration document, set
`notifiedAt` on any document (the `processLadderPreRegistrationLaunches` Cloud
Function sets it when the linked ladder's registration opens), or write
anyone else's registrant document.

## Server and staff only

`mail` (Trigger Email queue), `signupRateLimits`, `userRoles` (players read
their own), `noShowClaims`, `maestroBackups`, `ladders/*/playoffTies` (read
only), `ladders/*/prizePayouts` (players read their own), `ladders/*/reportCounts`
(read only), `ladderEligibility` (players read and delete their own), and any
collection not listed here.

## Courts and court submissions

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `courts/{courtId}` | Any signed-in player (app) | create | Full court shape with `verified: false`, `submittedBy` = own uid. League/tournament courts have no `submission`; ladder courts add `submittedVia: "ladder"` and `submission` (`status: "pending"`, `submittedBy` = own uid, `ladderId`, `ladderName`, `submittedByUsername`, `submittedAt`, `reviewedBy: null`, `reviewedAt: null`). |
| `courts/{courtId}` | Admin (website) | create, update, delete | Any field. Approving a submission sets `verified`, `verifiedBy`, `verifiedAt`, `updatedBy`, `updatedAt`, `location` and `submission.status` / `reviewedBy` / `reviewedAt`. |
| `ladders/{ladderId}` | Admin (website) | update | `courtIds` (arrayUnion) when approving a court submission, in the same batch as the court update. |
| `users/{userId}/notifications/{id}` | Admin (website) | create | System notifications to any player: court approved / not accepted (`type: "ladder"`, `data.ladderId`, `data.courtId`, `data.tab: "Matchmaking"`) and dispute updates (`type: "ladder-dispute"`). |

Players must not be able to: verify a court, edit another player's court, or
add a court to a ladder's `courtIds` (only approval does that).

## Ladder home court

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladders/{ladderId}/ladderParticipants/{userId}` | That player (singles) | update | Only `homeCourt`, `homeCourtChanges`, `homeCourtUpdatedAt`, `homeCourtUpdatedBy`. `homeCourtUpdatedBy` = own uid. |
| `ladders/{ladderId}/ladderTeams/{teamKey}` | Either team member (doubles) — uid in `playerIds` | update | Same four fields as above. |

Rules the app enforces in a transaction that rules should also enforce:
`homeCourt.courtId` must be a verified court in the ladder's `courtIds`;
`homeCourtChanges` may only go 0 → 1 (one change per ladder) and never
decrease. The ladder playoffs Cloud Function reads `homeCourt` for round-1
pairing, so a player must not be able to set an arbitrary location.

## Ladder joining

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladders/{ladderId}/ladderParticipants/{userId}` | That player (singles) | create | Participant built by `buildLadderParticipant` plus `joinedAt` = server timestamp (a playoff tiebreak, so it must not be editable afterwards). Written in a transaction with the ladder `participantCount` increment; allowed only while the ladder is `registrationOpen`, inside the registration window and under `maxPlayers`. |
| `ladders/{ladderId}/ladderTeams/{teamKey}` | A team member (doubles) | create | Team built by `createRootTeam` plus `joinedAt` (server timestamp), same rules. The `teams/{teamId}` doc must be `active` with two players. |
| `ladders/{ladderId}/ladderMembers/{userId}` | A team member (doubles) | create | Claim written in the same transaction as the `ladderTeams` create: `{ userId, teamKey, joinedAt }` (server timestamp), one per player. Must not exist for that player under another `teamKey` — this is what stops two teams sharing a player when they join at the same instant. |
| `ladders/{ladderId}/ladderMembers/{userId}` | A team member (doubles) | delete | Only in the batch that disbands the team (removes the `ladderTeams` doc and these claims together). |
| `ladders/{ladderId}/ladderParticipants/{userId}` and `ladders/{ladderId}/ladderTeams/{teamKey}` | Joining player | create (free ladders) | When the ladder's `entryFee` is 0 or unset, also require `exists(/ladderEligibility/{ladderId}_{request.auth.uid})`. Paid ladders have no location check. |
| `ladderEligibility/{ladderId}_{userId}` | Nobody (app) | create, update | Written only by the `verifyLadderEligibility` callable (Admin SDK) after a fresh, unmocked device reading puts the player within the ladder's `eligibilityRadiusMiles` (default `LADDER_ELIGIBILITY_RADIUS_MILES`) of one of its courts. Holds the distance, never coordinates. |
| same | That player (app) | delete | Own doc only. Used by the Maestro cleanup; deleting it only takes away the player's own permission to join. |
| `ladders/{ladderId}` | Admin (website ladder form) | create, update | `eligibilityRadiusMiles`: optional positive number, free ladders only. |
| `ladders/{ladderId}` | A joining player or team member | update | `participantCount` +1, only in the same transaction as the participant/team create above. |
| `teams/{teamId}` | A team member | update | `ladderIds` (arrayUnion) after joining a ladder. |

## Ladder match reporting

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladders/{ladderId}/ladderMatches/{matchId}` | A player in the match | update | Game report/decline/dispute/approve: `games`, `lastUpdated`, and `gameReportedAt.{gameId}` = server timestamp (the clock the auto-approval job ages a game from). Blocked only once playoffs have started (ladder status playoffs, completed or cancelled); play continues after registration closes. |

## Ladder match cancellation

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladders/{ladderId}/ladderMatches/{matchId}` | A player in the match (poster or partner) | update | **Posted** match only (nobody accepted): `matchStatus: "cancelled"`, `cancelledAt`, `cancelledReason`, `lastUpdated`. |
| same | A player in the match | update | **Accepted** match with no reported game: set `cancellationRequest` (`requestedBy` = own uid, `requestedAt`), only when no request is pending. Must not touch `lastUpdated` (it restarts the expiry clock). |
| same | A player on the **opposing side** to `cancellationRequest.requestedBy` (not the requester or their partner) | update | Accept: `matchStatus: "cancelled"`, `cancelledAt`, `cancelledReason: "Cancelled by agreement"`, `cancellationRequest: null`. Decline: `cancellationRequest: null`. |
| same | A player in the match | update | **Accepted** match with no reported game: set `rescheduleRequest` (`requestedBy` = own uid, `requestedAt`, `matchDate`, `matchTime`), only when none is pending. The new start must be in the future and before the posting deadline (regular) or the playoff tie's `deadlineAt`. |
| same | A player on the **opposing side** to `rescheduleRequest.requestedBy` | update | Accept: `matchDate` and `matchTime` from the request, delete `checkIn`, `rescheduleRequest: null`. Decline: `rescheduleRequest: null`. |
| same | A player in the match | update | **Accepted** match with at least one reported game and no `extension`: set `extension` (`requestedBy` = own uid, `requestedAt`, `expiresAt` = 7 days later, or the playoff tie's `deadlineAt` if sooner). Once only. |

Court-fee refunds on cancellation are settled server-side by
`onLadderMatchStatusChange` → `reconcileLadderCourtFee`, never by the client.

## Playoff matches

The lower-ranked side (by ladder rank) hosts match 1 and arranges it first; the
higher-ranked side hosts match 2 and the decider and can arrange match 2 once
match 1 exists. There is no coin toss.

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladders/{ladderId}/ladderMatches/{tieId}-leg{1\|2}` | A player on the side hosting that match; the opposing side for match 1 once the host is `LADDER_PLAYOFF_HOST_ARRANGE_HOURS` (48) hours overdue (`isLadderPlayoffHostArrangeOverdue`); or either side for "play the second match here now" (only once match 1 is `completed`, as match 2). On a doubles side either partner may write, and the other partner is notified | create, or replace a match that was cancelled | Built by `buildLadderPlayoffLegMatch`: `playoffTieId`, `playoffLeg`, both sides as `participants`, `courtFee: 0`, `matchStatus: "posted"`, the tie's `bestOf`, `createdBy` = the writer, `scheduleDeclines` carried over from the cancelled match it replaces, `playNow: true` for a play-now offer. Only while the tie is `scheduled`; only when no live match exists for that id (transaction); the start must be before the tie's `deadlineAt`; match 2 only once match 1 exists. |
| same | Either partner on the side opposite `createdBy` | update | Accept: `matchStatus: "accepted"`, `acceptedBy`, `acceptedAt`, `lastUpdated`, and for an accepted play-now offer match 1's `checkIn` copied over. |
| same | Either partner on the side opposite `createdBy` | update | Decline (only while `canDeclineLadderPlayoffMatch`: once per match for a timed match, always for a play-now offer): `matchStatus: "cancelled"`, `cancelledAt`, `cancelledReason`, `scheduleDeclines` + 1 (not for a play-now offer). |
| same | Players in the match | update | Reporting, approving and disputing exactly as regular matches (`isLadderMatchPlayFrozen` lets matches with a `playoffTieId` through while the ladder is in `playoffs`); cancel, reschedule and extension as regular accepted matches. |
| `ladders/{ladderId}/playoffTies/{tieId}/chat/{messageId}` | A player on either side of the tie | create | A message: `text`, `createdAt`, `user` = own uid. Spectators must not read or write it. |
| `users/{userId}/chats/{ladderId}-{tieId}` | A player on the tie writing to the other player's entry | create / update | `type: "chat"`, `isRead: false`, `messageCount`, `lastMessage`, `competitionName`, `competitionType: "ladder"`, `ladderId`, `tieId`. |

The decider (`playoffLeg: 3`), tie results, bracket advancement, reminders, the
24-hour auto-accept of an unanswered posted match (`autoAccepted: true`), the
walkover or void of a tie at its deadline (the only side with activity advances; `walkoverReason`), the settlement of a tie once a player is disqualified, the host-overdue notice (`hostOverdueNoticeSentAt`) and the
ladder's Completed status are written only by Cloud Functions
(`onLadderMatchStatusChange`, `processLadderPhases`). Clients must not write
`playoffTies`.

## Ladder phases and playoffs

Written only by the `processLadderPhases` Cloud Function (Admin SDK). Clients
must not be able to:

- set a ladder's `status`, `cancelledAt`, `cancelledReason`,
  `playoffsGeneratedAt`, `playoffBracketSize` or `playoffEntrantCount`;
- create, edit or delete anything under `ladders/{ladderId}/playoffTies`
  (read-only for clients; the Playoffs tab listens to it);
- edit the ranking inputs the bracket is built from (`competitionXP` / `XP`,
  `numberOfWins`, `totalPointDifference`, `joinedAt`, `homeCourt`) outside the
  existing game-scoring and home-court flows.

`processLadderPhases` also writes `users/{uid}/notifications` (cancellation
to every entrant, promotion to every qualifier) via the Admin SDK.

Payout must never depend on client-written data.

## Prize payouts and PROLevel

Ladder prize payouts are written only by Cloud Functions
(`onLadderMatchStatusChange` when the last deciding tie settles, and
`processLadderPhases` as the retry), in one transaction with the ladder's
Completed status. Clients must not be able to:

- set a ladder's `prizesDistributed`, `prizeDistributionDate`,
  `playoffsCompletedAt`, `unclaimedPrizePot` or `retainedPrizeMoney`;
- create or delete anything under `ladders/{ladderId}/prizePayouts`, or change
  any field there other than `review` as below (`paid`, `status`, `reason`,
  `review.appliedAt` are written by `onLadderPrizePayoutReviewed`);
- write a user's `profileDetail.XP` outside the existing game-scoring flows;
- write a user's `profileDetail.ladderStats`, `profileDetail.leagueStats`,
  `profileDetail.tournamentStats` or `profileDetail.cashWon` at all. `cashWon`
  (lifetime cash won, which drives PROLevel) is function-only: the app and the
  website only read it.

The one client write that touches these fields is sign-up
(`screens/Authentication/Signup.js`), which creates `users/{uid}` from
`profileDetailSchema` with `ladderStats` all 0 and `cashWon: 0`. Rules must
allow those starting values on create and nothing else.

| Client | Write | Who | Fields |
|---|---|---|---|
| Website admin, Prize Payouts page | update `ladders/{ladderId}/prizePayouts/{payoutId}` | Admins only (`userRoles`) | `review` only (`decision`, `amount`, `reason`, `decidedBy`, `decidedAt`), and only while `status` is `held` and `review` is unset |

Players read their own `prizePayouts` records (the app's ladder Summary shows a
prize under review); admins read all of them.

## Known gaps (not enforced by rules yet)

- **Profiles are public, including email.** Guests and 3.0.x sign-up read
  `users`. Fix: move private fields (email, phone, push tokens) to
  `users/{uid}/private/profile` and drop public reads once 3.0.x is gone.
- **Any signed-in player can rewrite competition and ladder results.** Leagues,
  tournaments, clubs, `ladderParticipants` / `ladderTeams` stats, `ladderMatches`
  and every player's `profileDetail.XP` are scored on the client, so rules can
  only check who is signed in, not that the maths is honest. Fix: move scoring
  into Cloud Functions (as ladder auto-approval already is).
- **Ladder match and dispute fields** (cancellation, reschedule, extension,
  playoff arranging, dispute stages) are checked by the app only; rules allow
  any signed-in player. Playoff tie chat is not limited to the tie's players.
- **Ladder registration window** (`registrationOpensAt` / `registrationClosesAt`)
  is not checked by rules; status, `maxPlayers` and free-ladder eligibility are.
- **iOS cannot detect fake GPS** for check-in (`recordLadderArrival`) or
  eligibility: expo-location only reports `mocked` on Android. Needs a native
  build.

## Testing the rules

`firestore-tests/rules.test.js` replays the writes above (3.0.x and 3.1.0
shapes, ladder line) against the emulator, plus the abuses the rules must block.

```bash
cd firestore-tests && npm install
java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-v*.jar --host 127.0.0.1 --port 8188 &
npm test
```

With Java 21+, `npm run test:emulator` starts and stops the emulator itself.

