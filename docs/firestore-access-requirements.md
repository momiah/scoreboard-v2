# Firestore access requirements

Client writes that Firestore security rules must keep allowing. Read this before
any security-rules work, and add a row whenever a feature adds a new client
write. Cloud Functions use the Admin SDK and bypass rules, so only app and
website (client SDK) writes belong here.

The repo rule files do not reflect what is deployed: `scoreboard-v2/firestore.rules`
denies everything and `courtchamps-website/firestore.rules` only covers
`userRoles`, yet the writes below work in production. Check the deployed rules
in the Firebase console before changing anything.

## Ladder pre-registration

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladder-pre-registration/{userId}_{ladderKey}` | That player (app) | create | Doc ID = `getLadderPreRegistrationId(uid, ladderKey)`. Exactly `userId` = own uid, `ladderKey` (one of `cash-mens-singles`, `cash-mens-doubles`, `community-singles`, `community-doubles`), `createdAt` = server timestamp, `notifiedAt: null`, `ladderId: null`. |
| same | That player (app) | delete | Own doc only ("Leave the list"). |
| same | That player (app) | read | Own docs only (`userId` = own uid); the app queries `where("userId", "==", uid)`. |

Players must not be able to set `notifiedAt` or `ladderId` (the
`notifyLadderPreRegistrations` Cloud Function sets them when a matching ladder
opens), read anyone else's pre-registrations, or write to `mail` (the queue the
Trigger Email extension sends from; Cloud Functions only).
