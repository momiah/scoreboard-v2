# Add-Game / Approve-Game Flow — Test Plan

Scenarios for the ladder **add-game (report a score) / approve-game** feature,
with the expected outcome for each. Same two layers as the reject-game plan:

- **Integration** (Jest, Firestore mocked) — decision gates and service logic.
  `updateLadderGame` / `approveLadderGame` live on `LadderContext`, not a
  plain service module like `services/disputes.ts`; tested via a render
  harness (mount `LadderProvider` + a small test consumer that calls them
  through `useContext`) rather than refactoring the Context — confirmed
  feasible, `LadderProvider` has no nested context dependencies or
  fetch-on-mount side effects to work around.
- **E2E** (Maestro) — real happy paths and cross-screen journeys. Marked 🅼.

Terminology: **reporter** = the player who submits a game score; **approver**
= any other participant who accepts it (approval is single-approval — see
2.1); **decider** = `floor(bestOf/2)+1` wins.

---

## 1. Reporting a game (GameLobby → AddTournamentGameModal → updateLadderGame)

| # | Scenario | Expected |
|---|----------|----------|
| 1.1 | Report the current reportable game | Written `Pending`, `numberOfApprovals: 0`, `numberOfDeclines: 0`, `reporter` set to the current user 🅼 |
| 1.2 | Tap a game that is **not** `getReportableLadderGameId` (e.g. game 2 while game 1 is still unresolved) | Blocked before the modal opens — toast "Report the current game before the next one" |
| 1.3 | Re-report a game that's already `Pending`/`approved` | `updateLadderGame` throws `LadderReportBlockedError("unavailable")` — "already been reported" |
| 1.4 | Report a game once the match is already decided (reported-wins hit the decider) | `LadderReportBlockedError("match_decided")` — "match already decided" |
| 1.5 | A player who hasn't checked in taps a game | Blocked with a check-in toast, modal never opens |

## 2. Approving a game (GameApprovalModal → approveLadderGame)

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | **Any one** other participant taps Accept | `LADDER_SINGLES_APPROVAL_LIMIT = 1` applies to both singles and doubles — the game is fully approved and scored immediately; no second approval is required 🅼 |
| 2.2 | Accept a game that's already `approved` | `ApproveLadderGameError("unavailable")` — "already been processed" |
| 2.3 | The same user taps Accept twice (already in `approvers`) | Same `unavailable` guard as 2.2 |
| 2.4 | Two approvers race on the same game (near-simultaneous) | Firestore transaction retry resolves it to a single approval; no duplicate scoring |
| 2.5 | Approving the **decider** game | `resolveLadderMatchOutcome` marks the match decided; `matchStatus` flips to `COMPLETED` 🅼 |
| 2.6 | Approving a **non-decider** game | Game scored individually; `matchStatus` stays `ACCEPTED`, match remains reportable for the next game 🅼 |
| 2.7 | Approving the decider game while **another** game in the same match is still disputed | `hasOpenLadderDispute` holds `matchStatus` at `ACCEPTED` even though the win-count reached the decider — cross-reference reject-game-flow-test-plan.md §6.1 |

## 3. Scoring on approval (shared helpers)

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Singles approval | `scoreSinglesLadderGame` → `calculatePlayerPerformance` updates both players' global Win/Loss/PD/XP/streak directly, **and** per-ladder `competitionXP` (CP) on each `ladderParticipants` doc 🅼 (exact-number verification, same pattern as the reject-flow CP assertions) |
| 3.2 | Doubles approval | `scoreDoublesLadderGame` updates each player's **global** XP/medals via `calculatePlayerPerformance`, but ladder CP is scored on the **team** docs via `calculateTeamPerformance`/`applyLadderTeamGameXp`, not per-player 🅼 |
| 3.3 | Doubles approval where a player has no `ladderParticipants` doc yet | `buildLadderParticipant` lazily creates one mid-transaction — exercise this path explicitly since it's the exact fallback that had the shared-mutable-state bug fixed in courtchamps-shared PR #49; confirm no cross-player contamination |
| 3.4 | Match decided by this approval | Each participant's (singles) or team's (doubles) `matchResultLog` gets a `W`/`L` appended |

## 4. Auto-approve (`functions/src/autoApproveLadderGames.ts`, every 30 min)

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | Game `Pending`, 0 declines, `createdAt` ≥ 24h ago | Auto-approved: `approvers += {userId: "system", username: "AutoApproval"}`, `autoApproved: true`, scored the same way as a real approval — **not Maestro-testable** (needs a 24h-old fixture or clock mocking); cover with a Jest test on the scheduled function, same pattern as `autoVoidLadderDisputes.test.ts` |
| 4.2 | Game `Pending`, < 24h old | Left alone this run |
| 4.3 | Game has ≥1 decline | Skipped (`numberOfDeclines !== 0`) even past 24h |
| 4.4 | Game is `disputed` | Skipped — `approvalStatus` is `"disputed"`, not `"pending"`, so `isDueForAutoApproval` excludes it by construction |

## 5. Match completion / decider interaction

| # | Scenario | Expected |
|---|----------|----------|
| 5.1 | Reported-wins hit the decider before all those games are approved | Further reporting is locked (`isLadderMatchReportDecided`) but `matchStatus` is **not** yet `COMPLETED` — approvals are still pending on already-reported games 🅼 |
| 5.2 | All decider-reaching games approved | `matchStatus: COMPLETED`, `completedAt` set |
| 5.3 | A resolved dispute **drops** a side below the decider (e.g. 3-1 → 2-1) | Cross-reference reject-game-flow-test-plan.md §6.3 — match reopens for the next reportable game |

## 6. UI state (GameLobby)

| # | Scenario | Expected |
|---|----------|----------|
| 6.1 | Match fully decided | Schedule card and match show `Completed`; unreported shells past the decider do nothing when tapped. (`lobby-games-locked` is the *not checked in* chip, not a decided-match state.) 🅼 |
| 6.2 | Doubles check-in | Rows grouped under `TeamHeader`/`TeamGroup` with `checkin-collapse-toggle`; singles stays a flat per-player list 🅼 |
| 6.3 | Reporter reports, then the **same** reporter (or, in doubles, the reporter's own partner) opens the game before the opponents approve | Game shows `Pending`; `GameScreen` hides the approval controls from the reporter's whole side. `approveLadderGame` enforces it too (`not_opponent`) so only a player on the opposing side can approve 🅼 |

---

## Coverage status

Maestro flows (`.maestro/flows`), singles and doubles unless noted. Every
approve flow asserts exact numbers on the ladder Performance/Team tab and the
opener's global UserProfile; the accept and tally flows also open the
Player/Team details screen and assert its stats.

| Scenario | Flow(s) |
|---|---|
| 1.1 report a score | `add-game-report-score`, `add-game-doubles-report-score` |
| 1.5 not checked in locks games | `add-game-not-checked-in-locks-games`, `add-game-doubles-not-checked-in-locks-games` |
| 2.1 / 3.1 / 3.2 single approval scores | `approve-game-accept-score`, `approve-game-doubles-accept-score` |
| 2.1 via the GameScreen header (second entry point) | `approve-game-via-game-screen`, `approve-game-doubles-via-game-screen` |
| 2.5 decider completes the match | `approve-game-decider-completes-match`, `approve-game-doubles-decider-completes-match` |
| 2.6 non-decider keeps match open | `approve-game-non-decider-continues`, `approve-game-doubles-non-decider-continues` |
| 3.3 missing participant docs (doubles only) | `approve-game-doubles-lazy-participant` |
| Multi-game accumulation (streak CP, summed PD, fractional XP) | `approve-game-two-games-tally`, `approve-game-doubles-two-games-tally` |
| 5.1 reporting locked while decider approval pending | `add-game-report-locked-at-decider`, `add-game-doubles-report-locked-at-decider` |
| 6.1 completed state | decider flows above |
| 6.2 check-in UI | `add-game-checkin-ui`, `add-game-doubles-checkin-ui` |
| 6.3 reporter / reporter's partner not offered approval | `add-game-reporter-cannot-approve-own-report`, `add-game-doubles-reporter-cannot-approve-own-report`, `approve-game-doubles-reporters-partner-cannot-approve` |

Jest:

- `context/LadderContext.test.tsx` — render harness over the real
  `LadderProvider`: 1.2–1.4, 2.2–2.4, 2.5–2.7, 3.1–3.4 at the context level.
- `functions/src/autoApproveLadderGames.test.ts` — 4.1–4.4 plus completion and
  dispute-hold behaviour with real scoring.

## Approval eligibility

Only a player on the **opposing** side of the reporter can approve a reported
game, in ladders, leagues and tournaments. For ladders this is enforced in
`approveLadderGame` (reason `not_opponent`); for leagues and tournaments in
`LeagueProvider.approveGame`. Both cover the reporter, the reporter's doubles
partner and non-players. The controls are hidden in `GameScreen` and disabled
in `GameApprovalModal`. The rule lives in `helpers/reportedGameApproval.ts`.
Report-time notifications already go only to the opponents. Leagues and
tournaments have no dispute route.

- Jest: `helpers/reportedGameApproval.test.ts`, "approval eligibility" in
  `context/LadderContext.test.tsx`, `context/LeagueContext.test.tsx` (league and
  tournament, singles and doubles).
- Approval limits above 1 (league and tournament): the game stays `Pending`
  until the limit is met, the same player cannot count twice, and
  `GameScreen` disables the controls for a player who has already approved
  (`context/LeagueContext.test.tsx`, "approval limit of two"). The limit is
  fixed at 1 today. Singles is always capped at 1 (`getEffectiveApprovalLimit`,
  since the opponent is the only eligible approver). Raising a doubles limit to
  2 needs `approveGame` to become one atomic transaction first (stub in the
  function). Cloud functions ignore approval limits.
- Not covered by Maestro for leagues/tournaments: there is no seed fixture for
  them yet.
- Maestro: `add-game-reporter-cannot-approve-own-report` (+ doubles) and
  `approve-game-doubles-reporters-partner-cannot-approve`.

Open: Decline from `GameScreen` is disabled for ladders, and the ladder
decline path in `LadderContext` is still commented out ("ready to implement");
declines currently go through the notification modal into the dispute flow.

## Fixture fidelity

Seeded doubles teams are built with `createRootTeam` via
`maestro/seeds/buildSeedLadderTeam.js` so they carry the real shape (`teamName`,
`players`, `createdBy`, `status`). An earlier version used `createTeam`, which
has no `teamName`/`players`: the UI then fell back to the players' names and
treated every team as empty (so "Request to Join" appeared on full teams).
Flows assert the team names, that the player-name fallback is absent, and
`team-details-request-to-join-only-when-team-has-room` covers the full-team
vs. team-with-room behaviour using a one-member control team.
