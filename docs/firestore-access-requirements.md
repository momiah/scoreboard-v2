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
| `ladders/{ladderId}/ladderParticipants/{userId}` | That player (singles) | create | Participant built by `buildLadderParticipant` plus `joinedAt` (join time; a playoff tiebreak, so it must not be editable afterwards). |
| `ladders/{ladderId}/ladderTeams/{teamKey}` | A team member (doubles) | create | Team built by `createRootTeam` plus `joinedAt`, same rule. |

## Ladder match cancellation

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladders/{ladderId}/ladderMatches/{matchId}` | A player in the match (poster or partner) | update | **Posted** match only (nobody accepted): `matchStatus: "cancelled"`, `cancelledAt`, `cancelledReason`, `lastUpdated`. |
| same | A player in the match | update | **Accepted** match with no reported game: set `cancellationRequest` (`requestedBy` = own uid, `requestedAt`) and `lastUpdated`, only when no request is pending. |
| same | A player on the **opposing side** to `cancellationRequest.requestedBy` (not the requester or their partner) | update | Accept: `matchStatus: "cancelled"`, `cancelledAt`, `cancelledReason: "Cancelled by agreement"`, `cancellationRequest: null`. Decline: `cancellationRequest: null`. Both set `lastUpdated`. |

Court-fee refunds on cancellation are settled server-side by
`onLadderMatchStatusChange` → `reconcileLadderCourtFee`, never by the client.

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
