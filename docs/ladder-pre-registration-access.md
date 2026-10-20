# Firestore access: ladder pre-registration

Client reads and writes the Firestore security rules must allow for ladder
pre-registration. Cloud Functions use the Admin SDK and bypass rules. The repo
`firestore.rules` denies everything; the deployed rules live in the Firebase
console. When `docs/firestore-access-requirements.md` reaches main with the
ladder branches, move this table into it and delete this file.

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladder-pre-registration/{userId}_{ladderKey}` | That player (app) | create | Doc ID = `getLadderPreRegistrationId(uid, ladderKey)`. Exactly `userId` = own uid, `ladderKey` (one of `cash-mens-singles`, `cash-mens-doubles`, `community-singles`, `community-doubles`), `createdAt` = server timestamp, `notifiedAt: null`, `ladderId: null`. |
| same | That player (app) | delete | Own doc only ("Leave the list"). |
| same | That player (app) | read | Own docs only (`userId` = own uid); the app queries `where("userId", "==", uid)`. |

Players must not be able to set `notifiedAt` or `ladderId` (the
`notifyLadderPreRegistrations` Cloud Function sets them when a matching ladder
opens), read anyone else's pre-registrations, or write to `mail` (the queue the
Trigger Email extension sends from; Cloud Functions only).
