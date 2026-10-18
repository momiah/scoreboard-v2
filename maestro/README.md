# maestro/

In-app test support for the Maestro flows in `.maestro/flows`. Nothing here is
imported by app code except `screens/Home/Home.tsx`, which loads
`MaestroHarness` through a `require` guarded by `__DEV__`, so none of it is
bundled into a release build.

- `MaestroHarness.tsx` — the test-only buttons the flows tap (seed, mock
  resolve/request evidence, cleanup). Each button has a `maestro-*` testID. The
  buttons are hidden until a transparent strip at the top of the harness
  (`maestro-harness-unlock`) is tapped five times; `.maestro/login.yaml` does
  this for every flow, so normal dev use sees a clean Home screen. The buttons
  are a compact wrapped grid so every one stays on screen: Maestro cannot find
  a button that sits below the fold or under the tab bar, so keep the harness
  small when adding buttons.
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
- `seeds/mockPlayoffOpponent.js` — the playoff opponent: arranges, accepts,
  declines, offers "play match 2 here" and chats; plus mock notifications and the
  tie-chat assertion. Notification ids start `maestro-po-` and the backend's
  start with the ladder id, so cleanup removes them.

## Seeds model production

A seed must look like data production would have written, or the flow proves
nothing. Before adding or changing one, check that:

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

## Re-attaching the harness

The harness is not mounted in the app while testing is finished, so Maestro
flows cannot find its buttons. To run them again, put these back in
`screens/Home/Home.tsx`:

```tsx
const MaestroHarness = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../maestro/MaestroHarness").default
  : null;
```

(above the video feed config), and, where the Home content renders (above the
"Hello" greeting):

```tsx
{MaestroHarness && currentUser ? (
  <MaestroHarness currentUser={currentUser} />
) : null}
```

When testing is done again, remove those two pieces and run the cleanup utility
first (`.maestro/utilities/cleanup-ladder-test-data.yaml`).
