Task: scaffold Maestro + Jest tests for the ladder add-game (report a score)
and approve-game flow, continuing the same testing effort as the reject-game
(dispute) flow.

Read `docs/testing/add-approve-game-flow-test-plan.md` first for the exact
scenarios and expected outcomes — this prompt is just the execution plan
around it.

1. Confirm the branch: continue from the current tip of
   `claude/ladders-mobile-summary` (same integration branch the reject-flow
   work merged into), on a new branch named `maestro-add-approve-game-flow-testing`.
   Do not branch from `main` — it's stale relative to ongoing ladder work.

2. Integration-test `updateLadderGame`/`approveLadderGame` via a render
   harness — mount `LadderProvider` with a small test consumer component
   that calls them through `useContext(LadderContext)`, mocking
   `firebase/firestore` the same way `services/disputes.test.ts` does. No
   changes to `context/LadderContext.tsx` itself.

3. Add a `devFunctions/seedAddApproveGameFlow.js` (singles) and
   `seedAddApproveGameFlowDoubles.js` (doubles), modeled on
   `seedRejectGameFlow.js`/`seedRejectGameFlowDoubles.js` — same
   `MAESTRO_*_ID` constant convention, same idempotent-reset-on-every-run
   shape. Seed a checked-in, accepted match with **no** game reported yet
   (so the flow can walk the real report → approve UI from the start,
   unlike the reject-flow seeds which start from an already-reported game).

   Per the standing convention: every seed helper gets a matching delete
   function in the same change, keyed on the same hardcoded fixture IDs —
   extend `devFunctions/cleanupRejectFlowTestData.js` into a shared
   `cleanupLadderTestData.js` (or add a sibling cleanup module) that also
   tears down whatever this seed creates, same pattern (full ladder
   subtree + fixture user docs + related notifications).

4. Add whatever testIDs are still missing — the exploration already found
   most of what's needed (`add-game-submit`, `add-game-score-input`,
   `game-approval-modal`, `game-approval-accept`, `game-approval-decline`,
   `checkin-${userId}`, `checkin-collapse-toggle`, `checkin-team-${teamId}`,
   `lobby-games-locked`, `ladder-game-${gameId}`). Check whether the
   approved/completed states need their own testIDs for exact-stat
   assertions (mirroring `profile-stat-wins`/`profile-stat-losses` and the
   ladder Performance-tab pattern from the reject flow) before assuming
   wildcard text matches will do.

5. Author the E2E-marked flows from the test plan's coverage section first
   (singles: 1.1, 2.1, 2.5, 2.6, 3.1; doubles: 3.2, 3.3; then 5.1, 6.1, 6.2),
   reusing the exact-number methodology from the reject-flow doubles work —
   run the real `scoreSinglesLadderGame`/`scoreDoublesLadderGame`/
   `calculatePlayerPerformance` against the seed's fixed inputs (or read
   `computeGameXp` directly, like the singles UPHELD numbers were derived)
   before writing CP/Win/PD assertions, don't guess them.

6. Run the first flow, show me the output, then stop for review before doing
   the rest — same checkpoint discipline as the reject-flow work.

Constraints (same as before): no secrets committed, throwaway seed data
behind clearly-named `devFunctions/` helpers (never admin-SDK scripts), keep
`npx tsc --noEmit` and `npm run lint` at no new errors, commit in logical
chunks, no PR unless asked, remove/avoid comments on anything built for this
testing effort (match the reject-flow branch's final state), and gate any
new test-only Home-screen buttons behind `__DEV__` from the start rather than
adding and then retrofitting the gate.
