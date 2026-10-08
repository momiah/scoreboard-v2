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
