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

## Pre-registration section

`sections/preRegistration.tsx` seeds six `maestro-prereg-*` pre-registrations
(cash and community, singles and doubles, one closed, one launched with its
ladder) with fixture registrants, and returns every string the screens show
(`maestro-expected-<fixture>-<field>`, from the shared prize and display
helpers). The scenario buttons (`-only-fixtures`, `-community-only`,
`-none-open`) close every open live pre-registration first, saving each status
in the hidden `maestro-prereg-live-status-backup` doc; it is never overwritten,
so seeding twice can't record "closed" as the original. Every flow that uses
them runs `.maestro/utilities/prereg/restore-live.yaml` in `onFlowComplete`,
which also runs when the flow fails; a restore that can't put a status back
fails with `CLEANUP INCOMPLETE`. `-launch` and `maestro-assert-prereg-launch-notified`
cover the `processLadderPreRegistrationLaunches` notification.

The Home banner and each ladder ticket are single touchables, so iOS merges
their text into one accessibility label: assert inside them with
`utilities/prereg/assert-banner.yaml` and `assert-ticket.yaml`, which match
regex-escaped expected values (`store-copied.js` keeps an `_re` copy).

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
