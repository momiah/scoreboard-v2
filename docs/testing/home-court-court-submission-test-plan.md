# Home Court / Court Submission — Test Plan

Scenarios for the ladder **Home Court** and **player-submitted courts**
features, with the expected outcome for each. Layers:

- **Jest** (Firestore mocked) — rules and components that Maestro cannot
  assert reliably. Marked 🅹.
- **E2E** (Maestro) — real journeys on the iOS simulator. Marked 🅼.
- **Website Jest** — the admin approve/reject batches in
  `courtchamps-website` `src/services/courts.test.ts` (`updateCourt`,
  `deleteCourt`). Maestro cannot drive the website, so the harness mocks those
  writes.

Terminology: **court picker** = `SearchLocationModal`, the one modal used
everywhere a ladder player chooses a court. It is reached from two places:
the **Home Court** section on Summary, and **Post a Match** on Matchmaking
(through the "Select a home court" info modal when no home court is set, or
through the post-a-match modal's Court selector once one is). **Awaiting
verification** = a court a player submitted that an admin has not yet
verified.

Rules under test: a player or team can change their home court **once**; a
home court must be a verified court in the ladder's `courtIds`; Post a Match
and accepting a posted match both require a home court.

---

## 1. Court submission (user submits a court)

| # | Scenario | Expected |
|---|----------|----------|
| 1.1 | Submit a court from the Home Court picker | Toast "Court sent for approval. You'll be notified once it's verified." shows inside the picker. The court is at the top of the picker with an "Awaiting Verification" pill. Tapping it does nothing and no home court alert appears 🅼 🅹 |
| 1.2 | Submit a court from the Matchmaking route (Post a Match → Select Home Court → picker) | Same as 1.1 🅼 |
| 1.3 | Submit a court from the post-a-match modal's Court selector (home court already set) | Same as 1.1, and the selector still reads "Select Court" with no pending-verification tag 🅼 |
| 1.4 | Admin approves the submission (mocked website batch) | Notification "`<court>` has been approved. You can now select it in `<ladder>`." Tapping it opens the ladder on **Matchmaking**; the court is now selectable (no pill) and can be chosen as the home court / match court 🅼 |
| 1.5 | Admin rejects the submission (mocked website batch) | Notification "`<court>` was not accepted for `<ladder>`." Tapping it opens **Matchmaking**; the court is gone from the picker 🅼 |
| 1.6 | Doubles: submit from the Home Court picker, approve, choose it | Same journey as 1.1 + 1.4 for a doubles ladder 🅼 |

## 2. Choosing a court (user does not submit)

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | Open the picker from the Home Court section | Every verified court in the ladder is listed and selectable. Other players' pending submissions for this ladder are greyed with "Awaiting Verification" and cannot be selected. Courts outside the ladder, unverified courts and other ladders' submissions are absent. Selecting a court shows "Set `<court>` as your home court? You can change it once for this ladder.", Confirm shows "Home court saved" and the card shows the court with **Change** 🅼 |
| 2.2 | Open the picker through Post a Match with no home court | The "Select a home court" info modal appears first; its button opens the same picker with the same contents as 2.1; choosing and confirming opens the post-a-match modal 🅼 |
| 2.3 | Open the picker through the post-a-match modal's Court selector (home court set) | Same contents as 2.1; choosing a court puts its name in the selector 🅼 |
| 2.4 | Doubles: 2.1 and 2.2 on a doubles ladder | Same results, using the team's home court 🅼 |
| 2.5 | Picker ordering | The current selection first, then the player's own pending submissions, then the rest alphabetically 🅹 |
| 2.6 | Country flags | Shown by default and hidden when `showCountryIcon` is false 🅹 |
| 2.7 | Add Court from the picker | The new court is selected straight away by default and not selected when `selectAddedCourt` is false 🅹 |

## 3. Home court rules

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Change once | With a home court set: **Change** → pick the other court → "Change your home court to `<court>`? This is your only change for this ladder." → Confirm → the card updates and **Change** disappears 🅼 |
| 3.2 | Change already used | The card shows the home court and there is no **Change** button 🅼 |
| 3.3 | Post a Match without a home court | The info modal appears; the post-a-match modal does not open until a home court is saved 🅼 🅹 |
| 3.4 | Post a Match with a home court | The post-a-match modal opens directly, with no info modal 🅼 🅹 |
| 3.5 | Accept a posted match without a home court | The info modal appears, then the accept-match modal opens after a home court is saved 🅼 🅹 |
| 3.6 | `setLadderHomeCourt` rules | Saves a verified ladder court without using the change; allows exactly one change; refuses `change_limit` after that; refuses `invalid_court` for an unverified court, a court outside the ladder, a missing court and a missing ladder; returns `error` for bad input or a failed transaction; writes a doubles home court to the team document and shares the single change across the team 🅹 |
| 3.7 | `useLadderHomeCourt` | Loading state, entrant detection, `canChange`, the set / change alert text, the "Home court saved" toast, `onSaved`, and each failure message 🅹 |

## 4. Website actions (mocked in Maestro)

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | Approve a pending submission with coordinates | One batch: court `verified`, `verifiedBy`, `submission.status: approved`, `reviewedBy` / `reviewedAt`; ladder `courtIds` `arrayUnion`; notification to the submitter (website Jest) |
| 4.2 | Approve without coordinates, or an already approved submission | Plain update; no batch, no notification (website Jest) |
| 4.3 | Reject a pending submission | One batch: court deleted and a "was not accepted" notification (website Jest) |
| 4.4 | Delete a court that is not a pending submission, or is missing | Document deleted only (website Jest) |

## Found and fixed while building these flows

- **An approved submission never became selectable.** The Add Court form
  starts from `courtSchema`, whose `courtId` is `""`, and `addCourt` stores that
  field. `getCourts` spread the document data over the real id, so every court
  a player created had an empty `courtId` in the app, which never matches the
  ladder's `courtIds` after the admin approves it. `getCourts` now lets the
  document id win. Regression test: `getCourts` in `context/LeagueContext.test.tsx`.

- **The submission toast was hidden.** It was shown through the root
  `showBottomToast`, underneath the native court picker and Add Court modals.
  `SearchLocationModal` now takes `addCourtSuccessMessage` and renders the toast
  inside its own modal; the ladder pickers pass `COURT_SUBMITTED_MESSAGE`.
  Regression tests: the success message cases in `SearchLocationModal.test.tsx`.

## Not covered yet

- A home court change by a doubles partner. Both members of a team can set
  the home court and post or accept matches (there is no team admin role by
  design), so there is no separate partner-permission flow.
- League and tournament court pickers (they share `SearchLocationModal` and
  `AddCourtModal` but contain no ladder logic).
- Loading skeletons.

## Fixtures

`maestro/seeds/seedHomeCourtFlow.js` (singles) and
`seedHomeCourtFlowDoubles.js` (doubles). Each seeds: a registration-open ladder
with two verified courts in `courtIds`; one verified court in no ladder; one
unverified court; the test user's pending submission and another player's
pending submission for this ladder; a pending submission for a different
ladder; an opponent's posted match; and the entrant (participant or team) with
no home court. Variants: home court set (`homeCourtChanges: 0`) and change
used (`homeCourtChanges: 1`). Re-running a seed resets its state.
`mockCourtSubmissionReview.js` mirrors the website's approve and reject
batches. `cleanupLadderTestData.js` also deletes the seeded courts, the courts
the test user submits (by `submittedBy` plus the "Maestro" name prefix) and the
notifications these flows create.

## Flows

| Flow | Scenarios |
|------|-----------|
| `court-submission-home-court-route` | 1.1, 1.4 |
| `court-submission-matchmaking-route` | 1.2, 1.4 |
| `court-submission-post-match-selector-route` | 1.3, 1.4 |
| `court-submission-rejected` | 1.5 |
| `court-submission-doubles-home-court-route` | 1.6 |
| `home-court-set-from-summary` | 2.1 |
| `home-court-post-match-gate` | 2.2, 3.3 |
| `home-court-post-match-court-selector` | 2.3 |
| `home-court-doubles-set-from-summary` | 2.4 |
| `home-court-doubles-post-match-gate` | 2.4 |
| `home-court-change-once` | 3.1 |
| `home-court-change-used-no-change-button` | 3.2 |
| `home-court-post-match-with-home-court` | 3.4 |
| `home-court-accept-match-gate` | 3.5 |
