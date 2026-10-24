# Firestore access: ladder pre-registration

Client reads and writes the Firestore security rules must allow for ladder
pre-registration. Cloud Functions use the Admin SDK and bypass rules. The repo
`firestore.rules` denies everything; the deployed rules live in the Firebase
console. When `docs/firestore-access-requirements.md` reaches main with the
ladder branches, move these tables into it and delete this file.

| Path | Writer | Operation | Fields / conditions |
|---|---|---|---|
| `ladderPreRegistrations/{preRegistrationId}` | Anyone (app) | read | Only `status == "open"` documents are listed by the app (`where("status", "==", "open")`). |
| same | Admin (website, and the app's dev-only launch button) | create, update, delete | Any field: the advertised ladder details (`name`, `description`, `image`, `region`, `countryCode`, `ladderType`, `genderType`, `entryFee`, `currencyType`, `maxPlayers`), `status` (`open` / `closed` / `launched`), `expectedOpensAt`, `ladderId`, created/updated fields. "Create ladder from this" sets `status: "launched"` and `ladderId` in the same batch that creates the ladder. |
| `ladderPreRegistrations/{preRegistrationId}/registrants/{userId}` | That player (app) | create | Doc ID = own uid. Exactly `userId` = own uid, `email` = own account email, `createdAt` = server timestamp, `notifiedAt: null`. Only while the parent's `status` is `open`. |
| same | That player (app) | read, delete | Own doc only ("Leave the list"). |
| same | Admin (website) | read | All registrants of a pre-registration, to count and export them. |

Players must not be able to: write a pre-registration document, set
`notifiedAt` on any document (the `processLadderPreRegistrationLaunches` Cloud
Function sets it when the linked ladder's registration opens), read anyone
else's registrant document, or write to `mail` (the queue the Trigger Email
extension sends from; Cloud Functions only).
