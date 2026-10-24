# Firestore access requirements

Client writes that Firestore security rules must keep allowing. Read this before
any security-rules work, and add a row whenever a feature adds a new client
write. Cloud Functions use the Admin SDK and bypass rules, so only app and
website (client SDK) writes belong here.

The repo rule files do not reflect what is deployed: `scoreboard-v2/firestore.rules`
denies everything and `courtchamps-website/firestore.rules` only covers
`userRoles`, yet the writes below work in production. Check the deployed rules
in the Firebase console before changing anything.

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
