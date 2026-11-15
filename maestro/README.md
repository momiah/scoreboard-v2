# maestro/

In-app test support for the Maestro flows in `.maestro/flows`. Nothing here is
imported by app code except `screens/Home/Home.tsx`, which loads
`MaestroHarness` through a `require` guarded by `__DEV__`, so none of it is
bundled into a release build.

## Harness

- `MaestroHarness.tsx` is the shell: a transparent strip
  (`maestro-harness-unlock`) that shows the buttons after five taps, a filter
  input (`maestro-harness-filter`) that hides every button whose testID doesn't
  contain the text, the `maestro-expected-*` labels, the
  `maestro-cleanup-test-data` button and every section's buttons.
  `.maestro/login.yaml` does the five taps for every flow, so normal dev use
  sees a clean Home.
- `harness/HarnessButton.tsx`: `HarnessButton` (a quarter-width grid cell that
  honours the filter), `Text`, and `SeedButton({ id, label, run })`, which runs
  a seed and shows "Seeded" with the outcome, or "Seed failed" with the error.
  Flows wait for that alert (`.maestro/utilities/harness.yaml`).
- `harness/HarnessExpected.tsx`: when a seed returns `{ expected: { key: value } }`,
  each value is shown as `maestro-expected-<key>`. Use it for any number a flow
  asserts that comes from a rule or a shared helper (a prize pool, a ladder
  size): the seed computes it with the `courtchamps-shared` helper, and the flow
  reads it with `copyTextFrom: { id: "maestro-expected-<key>" }` and asserts
  `${maestro.copiedText}`. Flows never contain the literal.
- The buttons are a compact wrapped grid so every one stays on screen: Maestro
  cannot find a button below the fold or under the tab bar.

## Sections

Each feature owns one file in `sections/`, so feature branches never edit the
same harness file:

```ts
const preRegistration: HarnessSection = {
  id: "preRegistration",
  Buttons: ({ currentUser }) => <>{/* SeedButtons */}</>,
  cleanup: ({ testUser }) => cleanupPreRegistrationTestData({ testUser }),
};
export default preRegistration;
```

Register it with one line in `sections/index.ts`. `maestro-cleanup-test-data`
runs every section's `cleanup` in order and keeps going past a failure, then
reports "Cleanup failed" with `CLEANUP INCOMPLETE` and the sections that
failed. `sections/core.tsx` holds the buttons every feature uses, including
`maestro-sign-out` (the app's own `Logout`), so signed-out flows can seed while
signed in and then sign out.

Put a feature's seeds and mocks next to its section (e.g.
`maestro/seeds/<feature>/`), each with a delete keyed on the same fixture ids.

## Fixture users

`fixtures/fixtureUsers.js` builds every fixture user a seed writes:
`buildFixtureUser` / `writeFixtureUser` give the same shape `createAccount.ts`
saves (the shared `userProfileSchema`, `usernameLower`, `provider:
"email_password"`, the default profile image) with a full location (city,
country, countryCode, postCode, address) picked from `FIXTURE_LOCATIONS` by the
user id, so a reused user keeps the same place. Emails are
`<userId>@example.com`, which can never be delivered. Seeds that create or
reuse a fixture user write it through `writeFixtureUser`, never a hand-built
user doc. `deleteFixtureUsers(ids)` removes the user docs and their
`notifications` and `chats`.

Fixture user ids start with `maestro`. Cleanup only runs when testing is
finished; re-seeding overwrites fixture docs, so stale data is not a reason to
clean up.

## Seeds model production

A seed must look like data production would have written, or the flow proves
nothing. Every number that is a rule comes from `courtchamps-shared`, never a
literal; flows read rule numbers from the `MAESTRO_*` env vars that
`.maestro/run-suite.sh` exports, or from `maestro-expected-*`.

## Ladder section

`sections/ladders.tsx` holds the ladder buttons. Its
`maestro-cleanup-ladder-test-data` button runs `cleanupLadderTestData` alone, as
the ladder flows expect; `maestro-cleanup-test-data` runs it with every other
section's cleanup.

- `seeds/` — client-SDK seed and cleanup helpers. Every seed has a matching
  delete, keyed on the same hardcoded fixture ids, via
  `seeds/cleanupLadderTestData.js`.
- `seeds/seedLadderPlayoffs.js` — playoff fixtures. Singles takes a `size`
  (2048 down to 127) and a `variant` (`standard`, `notQualified`, `upcoming`,
  `cancelled`); doubles takes `teams` (256 or 128). The test user is ranked #1
  (just below the cutoff for `notQualified`) and fixture players `P0001 S`…
  follow in rank order with home courts in 8 UK cities. "Generated" writes the
  bracket immediately with the same shared helpers as `processLadderPhases`
  and the promotion notification the function would send (the elimination
  notice for `notQualified`); the cancelled seed writes the cancellation
  notification. Every seed also writes a neutral
  "Maestro: open `<ladder>` on `<tab>`" notification so flows can reach the
  ladder. "Awaiting Function" leaves the bracket to the deployed function
  (every 15 minutes, or force-run its Cloud Scheduler job). Cleaned up by
  `cleanupLadderTestData`.
- `seeds/seedLadderPlayoffMatches.js` — the playoff match screen. Seeds the
  generated 256 ladder (a 16-player bracket, best of 7) and puts the test
  user's own game at one `stage`: `coinPending`, `coinWon`, `coinLost`,
  `leg1Posted` (the opponent posted match 1), `leg1Complete` (user 4-2 up and
  hosting match 2), `level` (6-6 with a decider and its notification) or
  `settled` (user through, the Quarter-Final open, with the round-reached
  notification). Every stage also dresses other round-1 games for browsing as a
  viewer: the user's neighbour in progress, one played, one void (its
  neighbour gets a walkover) and one level with a decider. Same cleanup.

- `seeds/seedLadderPlayoffJourney.js` — carries the playoff bracket forward to
  any round (Round of 16 to the Final, or the 3rd-place tie) with the test user's
  last reported game awaiting their approval, so the real
  `onLadderMatchStatusChange` settles the tie. Also `mockFinishCompanionTie`
  (plays out the neighbouring tie through the same trigger) and the assertions
  `assertPlayoffNotification` and `assertLadderCompleted`. Buttons exist for the
  free and the paid ladder (`-paid`).
- Manual testing: `maestro-seed-manual-128-final` seeds a 128-player ladder
  (`maestro-po-manual-128-ladder`) with the 8-player bracket generated, every
  quarter-final and semi-final played and decided with the test user through, and
  the Final and 3rd-place ties open one day in. Cleaned up with the rest.
- `seeds/mockPlayoffOpponent.js` — the playoff opponent: arranges, accepts,
  declines, offers "play match 2 here" and chats; plus mock notifications and the
  tie-chat assertion. Notification ids start `maestro-po-` and the backend's
  start with the ladder id, so cleanup removes them.

Ladder seeds also check that:

- matches are played inside their tie's window (start to deadline), and a tie
  that has started has the matches that got it there;
- a settled tie was decided by its matches, finished when its last match did,
  and the next round started at that moment;
- posted matches are recent (an unanswered playoff match is accepted for the
  away side after `LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS`);
- every number that is a rule (the tie window `LADDER_PLAYOFF_TIE_DAYS`, the
  auto-accept hours) comes from `courtchamps-shared`, never a literal. Flows read
  them from `MAESTRO_PLAYOFF_TIE_DAYS` and `MAESTRO_LADDER_AUTO_ACCEPT_HOURS`,
  which `run-suite.sh` exports.

`seeds/realWorldChecks.helper.js` asserts the first three and runs against every
playoff stage in the seed tests. Add a stage to those tests when you add one.

## Live data

Seeds write to the live Firebase project through the client SDK (`db` from
`services/firebase.config`), the same way the app does.

Pre-registration seeds may write open `ladderPreRegistrations` to live data only
until pre-registration ships in a store build or OTA update, because the app
lists every open pre-registration to every user. Seeds that change live
documents (e.g. closing the `launch-*` pre-registrations to force an empty
state) record the previous value and their cleanup restores it exactly; a
failed restore must fail loudly. Once pre-registration ships, these flows and
seeds move to the Firestore emulator: a test-run config that points the app at
the emulator, guarded by `__DEV__` and an env flag so release builds can never
reach it.

## Re-attaching the harness

When testing is finished, the harness is detached from Home and Maestro flows
cannot find its buttons. To run them again, put these back in
`screens/Home/Home.tsx`:

```tsx
const MaestroHarness = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../maestro/MaestroHarness").default
  : null;
```

(above the video feed config), and, above the "Hello" greeting:

```tsx
{MaestroHarness && currentUser ? (
  <MaestroHarness currentUser={currentUser} />
) : null}
```

When testing is done again, run `.maestro/utilities/cleanup-test-data.yaml`
first, then remove those two pieces.
