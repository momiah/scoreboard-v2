# Reject-Game (Dispute) Flow — Test Plan

Scenarios for the ladder **reject-game / dispute** feature, with the expected
outcome for each. Use this as the checklist for both layers:

- **Integration** (Jest + `@testing-library/react-native`, runs in CI / cloud) —
  screen + service logic with Firestore mocked. Some scenarios below are
  **already covered** (marked ✅ with the file).
- **E2E** (Maestro, runs on a simulator/device) — the real happy paths and a
  few cross-screen journeys. Marked 🅼 where Maestro is the right layer.

Terminology: **reporter** = the player who reported the game; **opener** = the
player who rejected it and opened the dispute; **decider** = `floor(bestOf/2)+1`.

---

## 1. Entry point — approve vs. reject (GameApprovalModal, ladder branch)

| # | Scenario | Expected |
|---|----------|----------|
| 1.1 | Opener taps **Decline** on a pending reported game | Navigates to `GameDisputeScreen` with the game context (ladderId, matchId, gameId, participantIds); **no** dispute created yet, game **not** deleted ✅ `GameApprovalModal.test.tsx` |
| 1.2 | Game already has an active dispute | Accept/Decline locked; a **disputed** link opens the existing dispute ✅ |
| 1.3 | Game already approved | Actions locked; "already been approved" shown ✅ |
| 1.4 | Game shell deleted before opening | "No longer exists" state; notification marked read ✅ |
| 1.5 | Opener taps **Accept** on a valid game | `approveLadderGame` runs; reporter notified; modal closes 🅼 |
| 1.6 | Double-approve race (two approvers) | Second approval is a no-op; no duplicate scoring 🅼 |

## 2. Composing & opening a dispute (GameDisputeScreen → createDispute)

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | Submit with **neither note nor video** | Blocked as `invalid`; nothing written ✅ `disputes.test.ts` |
| 2.2 | Submit with a **note only** | Dispute opens `under_review`, game flagged `disputed`, OPENED event recorded ✅ |
| 2.3 | Submit with a **video but no court positions** | Blocked (`court_positions`) — video evidence needs positions ✅ (validity rule) |
| 2.4 | An **active** dispute already exists for the game | Refused as `exists` (duplicate guard) ✅ |
| 2.5 | Only a **resolved** dispute exists for the game | New dispute allowed ✅ |
| 2.6 | Disputed game is **not** in the match shell (stale) | Dispute doc still written, but no game flagged ✅ |
| 2.7 | Only the **disputed game** is flagged, siblings untouched | Sibling games keep their status ✅ |
| 2.8 | Video **minimum duration** is 1 min for disputes (not 3) | Sub-1-min video rejected; 1-3 min accepted — **not Maestro-testable**: `expo-image-picker`'s native library picker runs out-of-process via iOS ExtensionKit (`PHPickerViewController`), and Maestro's accessibility tree cannot see or tap into it (confirmed: the picker opens and is visibly on screen, but `tapOn` by id or text finds nothing). The guard itself (`getGuardError` in `components/Modals/VideoUploadModal.tsx`) is a pure function of a duration number — better covered by a Jest test than an E2E flow. |

## 3. Evidence timeline (addDisputeEvidence)

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Empty evidence | `invalid`, no transaction ✅ `disputes.test.ts` |
| 3.2 | Evidence after the dispute is **resolved** | `resolved` (locked) ✅ |
| 3.3 | Evidence from a **non-participant** | `invalid` ✅ |
| 3.4 | Second **video** in the same round by the same player | `video_limit` ✅ |
| 3.5 | A **note** submission | Appended; stage stays `under_review`; void deadline cleared ✅ |
| 3.6 | New video allowed **after** an admin `evidence_requested` | Upload permitted again 🅼 / integration extension |
| 3.7 | Both players submit; timeline renders each as its own phase | Ordered phases, correct authors 🅼 |

## 4. Withdrawing a dispute (cancelDispute)

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | A **non-opener** tries to cancel | `not_opener` ✅ `disputes.test.ts` |
| 4.2 | Cancel an **already-resolved** dispute | `resolved` ✅ |
| 4.3 | Opener cancels a live dispute | Resolved via `CANCELLED` plan; original game approved/scored; match + dispute docs updated ✅ |

## 5. Admin resolution (planDisputeResolution outcomes)

| # | Scenario | Expected |
|---|----------|----------|
| 5.1 | **UPHELD** — disputed scores stand | Corrected game scored; players/teams/CP updated 🅼 / integration (shared helper) |
| 5.2 | **REJECTED** — original scores stand | Original game scored as reported |
| 5.3 | **VOID** — no evidence in window | Original scores stand (like rejected) |
| 5.4 | Resolution is **terminal** | No further evidence/cancel accepted (see 3.2, 4.2) |
| 5.5 | Doubles dispute updates **both** team docs | Team stats reflect the resolved result |

## 6. Interaction with match progress (the hard edge cases)

| # | Scenario | Expected |
|---|----------|----------|
| 6.1 | Match completion **held** while any game is disputed | Match cannot complete/settle until the dispute resolves |
| 6.2 | Decider lock — a disputed game can't push wins **past** the decider | Score can never exceed the decider (3/4/5/6) |
| 6.3 | Resolution **drops** a decisive win (e.g. 3-1 → 2-1) | Match re-opens for the next reportable game; not falsely completed |
| 6.4 | Resolution **raises** a win to the decider | Match completes correctly, no extra games reportable |
| 6.5 | **Auto-approve** must NOT approve a disputed game | Disputed game skipped by `autoApproveLadderGames` |
| 6.6 | **Auto-expire** must NOT expire a match with an open dispute | `isLadderMatchExpired` returns false while a dispute is open |
| 6.7 | **Auto-void** stale dispute after the evidence window | Dispute voided; original scores stand; match resumes |

## 7. UI state reflection (dimming / pills)

| # | Scenario | Expected |
|---|----------|----------|
| 7.1 | Disputed game shows a **Disputed pill** and is dimmed | FixtureGameItem + GameScreen reflect `disputed` 🅼 |
| 7.2 | Dispute screen links to the **ladder** and **match details** | Links navigate correctly 🅼 |
| 7.3 | Opening match details **glows** the disputed game | Scroll-to + highlight 🅼 |
| 7.4 | Schedule match cards dim only on **terminal** states | Non-terminal disputed match not dimmed on the schedule 🅼 |

---

## Coverage summary

- ✅ **Integration, done now:** all of §1 (1.1–1.4), §2 (2.1–2.7), §3 (3.1–3.5),
  §4 (4.1–4.3) — the decision gates and the full service lifecycle with guards.
- 🅼 **Maestro, to author on device:** the real happy paths (1.5, 3.6–3.7),
  admin resolution journeys (§5), and the UI-state scenarios (§7). 2.8 is
  **not Maestro-testable** (see its row above) — cover it with a Jest test
  on `getGuardError` instead.
- **Integration, worth adding next:** §6 is mostly **pure shared helpers**
  (`resolveLadderMatchOutcome`, `isLadderMatchReportDecided`,
  `getReportableLadderGameId`, `isLadderMatchExpired`, `hasOpenLadderDispute`) —
  cheap, fast unit/integration tests that lock the trickiest logic (decider,
  completion hold, auto-fn skips). Recommended as the next batch.

## How to run the integration tests

```bash
npm test                              # whole suite
npx jest services/disputes.test.ts    # dispute lifecycle
npx jest components/Modals/GameApprovalModal.test.tsx   # reject entry point
```

> Note: two **pre-existing** suites (`devFunctions/backfillLeagueGames.test.js`,
> `helpers/backfillLeagueTeams.test.js`) fail to load because they import an
> untransformed ESM module — this predates the test harness added here and is
> unrelated to the dispute flow. Worth fixing separately (extend
> `transformIgnorePatterns`, or mock the offending import).
