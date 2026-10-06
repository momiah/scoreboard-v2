# maestro/

In-app test support for the Maestro flows in `.maestro/flows`. Nothing here is
imported by app code except `screens/Home/Home.tsx`, which loads
`MaestroHarness` through a `require` guarded by `__DEV__`, so none of it is
bundled into a release build.

- `MaestroHarness.tsx` — the test-only buttons the flows tap (seed, mock
  resolve/request evidence, cleanup). Each button has a `maestro-*` testID. The
  buttons are hidden until a transparent strip at the top of the harness
  (`maestro-harness-unlock`) is tapped five times; `.maestro/login.yaml` does
  this for every flow, so normal dev use sees a clean Home screen.
- `seeds/` — client-SDK seed and cleanup helpers. Every seed has a matching
  delete, keyed on the same hardcoded fixture ids, via
  `seeds/cleanupLadderTestData.js`.
- `seeds/seedLadderPlayoffs.js` — stub for the ladder playoffs phase. It is not
  imported anywhere yet; implement it (and wire a harness button plus flows)
  once playoffs lands.
