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
| 1.7 | One match fails | The rest of the ladder and run continue 🅹 🅴 |
| 1.8 | The job runs against a real Firestore | Scored once with the server report time, skipped in playoffs, decider completes the match once, a disputed sibling holds completion 🅴 (`autoApproveLadderGames.emulator.test.ts`) |
| 1.9 | A player approves at the same moment the job runs; three job runs overlap | Each game is approved and scored exactly once (25 matches raced at once) 🅴. Verified by swapping the job for a non-transactional version: both race tests then fail |

## 2. Playoff freeze

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | Approve a game in a `playoffs`, `completed` or `cancelled` ladder | `frozen`, nothing written 🅹 |
| 2.2 | Same while `registrationClosed` | Allowed 🅹 |
| 2.3 | Report a score, accept a posted match, open a dispute, add evidence, cancel a dispute or approve a disputed score once frozen | `frozen`, nothing written 🅹 |
| 2.4 | Auto-approval on a frozen ladder | Skipped 🅹 |
| 2.5 | Approval notification modal | Shows the disclaimer, Accept and Decline do nothing 🅼 (`ladder-freeze-approval-modal-disclaimer`) 🅹 |
| 2.6 | Accept-match modal, Game screen, dispute screen | Disclaimer shown and actions locked 🅼 (`ladder-freeze-accept-match-modal-disclaimer`, `ladder-freeze-game-screen-disclaimer`, `ladder-freeze-dispute-screen-disclaimer`) |

## 3. Joining

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Join while registration is open | Participant written with a server `joinedAt`, count +1, one transaction 🅹 |
| 3.2 | Join after status moved on, after `registrationClosesAt`, before `registrationOpensAt`, or at `maxPlayers` | `closed` / `not_open` / `full`, nothing written 🅹 |
| 3.3 | Join twice | `alreadyJoined`, count unchanged 🅹 |
| 3.4 | A team joins | The `teams/{teamId}` doc is re-read: pending, one-player or missing teams are refused whatever the client sends 🅹 |
| 3.5 | A team joins after registration closed | Refused 🅹 |

| 3.6 | A team with a player already in another team on the ladder | Refused `conflict`, naming the player: found by the query on `ladderTeams` `playerIds array-contains-any` (single-field index, no composite index needed) 🅹 🅼 |
| 3.7 | A team with a player who is already a ladder participant | Refused `conflict` 🅹 |
| 3.8 | Two teams sharing a player join at the same instant | Each join writes one `ladderMembers/{userId}` claim per player inside its transaction, so the second to commit sees the first's claim and is refused 🅹 🅼 (a claim seeded with no team doc) |
| 3.9 | The conflict query fails (offline) | Join refused, never allowed (fails closed) 🅹 |
| 3.10 | Disbanding a team | Deletes its `ladderMembers` claims with the team doc, so the players can join again 🅹 |

Maestro flows: `join-ladder-singles-success`, `-full`,
`-registration-window-closed`, `-registration-closed-status`;
`join-ladder-doubles-success`, `-incomplete-teams-cannot-be-selected`,
`-partner-already-in-ladder`, `-simultaneous-join-claim`, `-full`,
`-registration-window-closed`.

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
| 6.2 | No fix within 15s | Falls back to the last known position (60s old at most), otherwise the check fails and can be retried 🅹 (cannot be reproduced in Maestro: the simulator always returns a fix) |
| 6.3 | Within 500m of the court | "Location verified" and the Checkin button 🅼 (`checkin-near-court-verifies-location`) |
| 6.4 | Far from the court | Failed state naming the distance and the 500m limit; after moving to the court, "Check again" verifies 🅼 (`checkin-far-from-court-blocks-then-retry-verifies`) |

## 7. Disbanding a doubles team

All 🅼 (`team-disband-*`), reached from the ladder Summary → Current Position →
team → ⋯ → Disband team. The claim cleanup is 🅹 (3.10).

| # | Scenario | Expected |
|---|----------|----------|
| 7.1 | Registration open, no matches | "Team disbanded", back on the ladder, team gone from Current Position |
| 7.2 | A posted match | "Can't disband" (posted or accepted match); cancel it from Matchmaking, then Disband succeeds |
| 7.3 | An accepted match | "Can't disband" (posted or accepted match) |
| 7.4 | One approved game in a running ladder | "Can't disband" (completed a game) |
| 7.5 | Registration closed; playoffs | "Can't disband" (registration has closed) |
| 7.6 | Ladder completed | Disbands |
| 7.7 | Approved games only in another, completed ladder | Disbands |
| 7.8 | The partner asked to cancel an accepted match and the opponent agreed | Disbands (`team-disband-allowed-after-partner-request-is-agreed`) |
| 7.9 | The user asked to cancel and the opponent agreed | Disbands (`team-disband-allowed-after-own-request-is-agreed`) |
| 7.10 | A cancellation request nobody has answered; a reported game | "Can't disband" (`team-disband-blocked-while-cancellation-request-is-unanswered`, `team-disband-blocked-once-a-game-is-reported`) |

## 8. Match cancellation

All 🅼 (`cancel-*`).

| # | Scenario | Expected |
|---|----------|----------|
| 8.1 | Cancel your own posted match from the Matchmaking modal; from Ladder Menu → Current Posted Matches | "Match cancelled", it leaves Matchmaking / the list |
| 8.2 | Accepted match: request cancellation | "Cancellation request sent" and an awaiting banner; if the opponent accepts the card reads Cancelled, if they decline the banner clears and the match stands |
| 8.3 | The opponent has asked to cancel | Banner with Accept Cancellation and Decline; accepting cancels the match, declining shows "Cancellation declined" |
| 8.4 | A second request while one is pending | "Waiting for your opponent to respond", no new request |
| 8.5 | A game has been reported | "This match can no longer be cancelled" |
| 8.6 | Doubles: the partner already asked | Awaiting banner, no Accept or Decline |
| 8.7 | Sending a request; accepting; declining | The opponent (singles) or both opposing players (doubles) get "asked to / agreed to / declined to cancel your ladder match", opening the ladder on Schedule |
| 8.8 | The opponent answers your request | You get the response notification and tapping it opens the ladder on Schedule (card reads Cancelled, or the request is cleared) |
| 8.9 | Doubles: the opposing team's player requested | The user sees Accept and Decline and can accept or decline (`cancel-doubles-opponent-request-user-accepts`, `-declines`) |
