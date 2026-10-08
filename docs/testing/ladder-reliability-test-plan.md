# Ladder reliability — Test Plan

What stops a player being cheated or mis-ranked by a system fault, and the test
that proves it. Legend: 🅼 Maestro flow, 🅹 Jest, 🅴 Firestore emulator.

Play (report, approve, dispute, accept) stays open from registration close
until **playoffs start**. It freezes only when the ladder status is `playoffs`,
`completed` or `cancelled`; the one rule lives in
`courtchamps-shared` (`isLadderMatchPlayFrozen`), and the copy in
`LADDER_FROZEN_MESSAGE`: "This game can no longer be actioned as playoffs has
started".

## 1. One approve-and-score path

`planLadderGameApproval` (shared) is the only approve + score implementation.
The app's `approveLadderGame` and the 30-minute `autoApproveLadderGames` job
both read the docs inside a transaction, call it, and persist what it returns.

| # | Scenario | Expected |
|---|----------|----------|
| 1.1 | Opponent approves a reported game | Scored, approver recorded, match completes on the decider 🅹 (shared + `LadderContext.test.tsx`) 🅼 (`approve-game-*`) |
| 1.2 | Reporter, partner or stranger approves | Refused `not_opponent` 🅹 🅼 |
| 1.3 | Approving a disputed game, one with no result, or one already approved | Refused 🅹 |
| 1.4 | Auto-approval after 24h | Same scoring as 1.1 with approver `AutoApproval`, in a transaction per game 🅹 (`autoApproveLadderGames.test.ts`) |
| 1.5 | Two overdue games in one match | Each in its own transaction on fresh data, streaks accumulate 🅹 |
| 1.6 | A disputed sibling game | Match completion held 🅹 |
| 1.7 | One match fails | The rest of the ladder and run continue 🅹 |

## 2. Playoff freeze

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | Approve a game in a `playoffs`, `completed` or `cancelled` ladder | `frozen`, nothing written 🅹 |
| 2.2 | Same while `registrationClosed` | Allowed 🅹 |
| 2.3 | Report a score, accept a posted match, open a dispute, add evidence, cancel a dispute or approve a disputed score once frozen | `frozen`, nothing written 🅹 |
| 2.4 | Auto-approval on a frozen ladder | Skipped 🅹 |
| 2.5 | Approval notification modal | Shows the disclaimer, Accept and Decline do nothing 🅼 (`ladder-freeze-approval-modal-disclaimer`) 🅹 |
| 2.6 | Accept-match modal, Game screen, dispute screen | Disclaimer shown and actions locked (no Maestro seed yet; rules proven in 2.3) |

## 3. Joining

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Join while registration is open | Participant written with a server `joinedAt`, count +1, one transaction 🅹 |
| 3.2 | Join after status moved on, after `registrationClosesAt`, before `registrationOpensAt`, or at `maxPlayers` | `closed` / `not_open` / `full`, nothing written 🅹 |
| 3.3 | Join twice | `alreadyJoined`, count unchanged 🅹 |
| 3.4 | A team joins | The `teams/{teamId}` doc is re-read: pending, one-player or missing teams are refused whatever the client sends 🅹 |
| 3.5 | A team joins after registration closed | Refused 🅹 |

Not enforceable client-side: two different teams containing the same player
joining at the same instant (needs a query inside the transaction). Tracked for
the server-enforcement work.

## 4. Clocks and ranking

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | A report | `gameReportedAt.{gameId}` is a server timestamp 🅹 |
| 4.2 | Auto-approval age | Uses the server stamp over a client `createdAt` in both directions 🅹 |
| 4.3 | CP such as 0.1 + 0.2 vs 0.3 | Equal after 2-decimal rounding, so wins decide the tiebreak 🅹 (shared) |

## 5. Playoff generation (function)

All 🅴 in `processLadderPhases.emulator.test.ts`, 🅹 in
`processLadderPhases.test.ts`: held up to 48h for open disputes or pending
games then generated; deleted accounts skipped; disqualified players excluded
from qualifying but still sent the elimination notice; doubles counted by team;
two concurrent runs generate one bracket and one set of notifications; a crashed
run resumes without duplicate notifications (deterministic notification ids).

## 6. Check-in

| # | Scenario | Expected |
|---|----------|----------|
| 6.1 | GPS fix arrives | Used 🅹 |
| 6.2 | No fix within 15s | Falls back to the last known position (60s old at most), otherwise the check fails and can be retried 🅹 |
