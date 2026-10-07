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
- `seeds/seedLadderPlayoffs.js` — playoff fixtures: a 2048-player singles
  ladder (top 128) and a 256-team doubles ladder (top 16), both past their
  playoff start, with the test user ranked #1 and fixture players ranked in
  order with home courts in 8 UK cities. "Awaiting Function" leaves the
  bracket to the deployed `processLadderPhases` (runs every 15 minutes, or
  force-run its Cloud Scheduler job); "Generated" writes it immediately with
  the same shared helpers. Cleaned up by `cleanupLadderTestData`.
