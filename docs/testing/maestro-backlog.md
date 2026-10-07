# Maestro backlog

Flows to add when the related feature is next under Maestro test. Remove an
entry once its flow exists.

## Team disbanding (doubles ladders)

The rule (`disbandTeam` in `context/LadderContext.tsx`, helpers in
`helpers/teamLadderActivity.ts`). A team **cannot** disband while, in a ladder
that is still running (not completed or cancelled), it:

- has completed (approved) a game in that ladder;
- has a posted or accepted match in that ladder — it must cancel it first;
- or any of its ladders has closed registration or is in playoffs.

Games and matches in other ladders, or in completed/cancelled ladders, don't
count. Cancelling: Match Details → menu (☰) → Cancel Match. Any player in the
match (poster, accepter, or either partner) can cancel a posted or accepted
match until a game has been reported.

Flows to cover (singles has no leave option, so doubles only):

1. Registration open, no matches → Disband succeeds; the team is gone from the
   ladder and the participant count drops by one.
2. Team has a **posted** match → "Can't disband" (cancel it first). Cancel the
   match from Match Details → Cancel Match → Disband now succeeds.
3. Team has an **accepted** match it accepted from an opponent → "Can't
   disband". Cancel it from Match Details → Cancel Match → Disband succeeds.
4. Same as 3, but the **partner** cancels the match → Disband succeeds.
5. Opponent's team posted, this team accepted, a game has been reported →
   Cancel Match shows "This match can no longer be cancelled"; Disband still
   blocked.
6. One approved game in this ladder → "Can't disband" (completed a game in a
   ladder that's still running).
7. Approved games only in a different, completed ladder → Disband succeeds.
8. Ladder registration closed (and separately, in playoffs) → "Can't disband"
   (registration has closed).
9. Ladder completed → Disband succeeds.

## Match cancellation

Helpers in `helpers/ladderMatchCancellation.ts`, UI via
`hooks/useLadderMatchCancellation.ts`.

- **Posted** match (nobody accepted): the poster or their partner cancels it
  straight away from (a) the Matchmaking modal on their own match ("Cancel
  Match"), (b) Ladder Menu → Current Posted Matches → Cancel, or (c) Match
  Details → menu → Cancel Match.
- **Accepted** match, no game reported: Cancel Match sends a cancellation
  request. The opposing side gets a notification and a banner on Match Details
  with Accept Cancellation / Decline. The requester's side sees "Waiting for
  your opponent to respond". The requester's partner cannot respond.
- Accept → match cancelled, requester's side notified, court fee refunded to
  the accepter server-side. Decline → request cleared, requester's side
  notified, match goes ahead (play it or face a no-show).
- A reported game → "This match can no longer be cancelled".

Flows to cover (singles and doubles):

1. Post a match → open it in Matchmaking → Cancel Match → it disappears from
   Matchmaking.
2. Post a match → Ladder Menu → Current Posted Matches lists it live → Cancel →
   it leaves the list and Matchmaking.
3. Accepted match → poster requests → opponent sees the banner → Accept →
   match cancelled for both; requester notified.
4. Same, opponent Declines → banner clears; match still accepted; requester
   notified.
5. Doubles: requester's partner sees "Waiting…" (no Accept/Decline); either
   opponent can respond.
6. A second request while one is pending is refused ("Waiting for your
   opponent").
7. Game reported → Cancel Match shows "This match can no longer be cancelled".

## Refunds and the platform fee

The rule: the platform fee is refunded only when the **platform** cancels (the
backend, e.g. fewer than 128 entrants at registration close, or the admin). It
is kept whenever a **user** causes the refund (a match cancellation they
requested or agreed to), because Stripe still charges the platform.

| Cancellation | Who caused it | Refund |
|---|---|---|
| Ladder under 128 at registration close (`processLadderPhases`) | Platform | Full entry fee, platform fee included (`refundLadderEntryFees`) |
| Ladder cancelled by the admin (no admin action yet) | Platform | Full entry fee, platform fee included |
| Posted match cancelled before anyone accepted | User | Nothing to refund — the accepter is only charged on accept |
| Accepted match cancelled by agreement | User | Accepter's court-fee share refunded; platform fee kept (`reconcileLadderCourtFee` via `onLadderMatchStatusChange`) |
| Accepted match expired / poster no-show | — | Accepter's court-fee share refunded; platform fee kept |

Payments are stubs today, so Maestro can only assert the UI. Flows to cover:

1. Accept a cancellation request → the confirm alert says the court fee is
   refunded to the player who accepted the match → match shows as cancelled.
2. Paid ladder under 128 at registration close (seeded) → Playoffs tab shows
   "This ladder was cancelled" with "Too few registrations".
3. Once payments are built: assert the refund amounts above (with and without
   the platform fee) through the payment provider's test mode, and that a
   re-fired trigger never refunds twice.

## Ladder cancellation and playoffs

Seeds: `maestro/seeds/seedLadderPlayoffs.js` (harness buttons
`maestro-seed-ladder-playoffs`, `…-generated`, `…-doubles`,
`…-doubles-generated`; cleanup via `cleanupLadderTestData`).

- Singles ladder `maestro-po-ladder` ("Maestro Playoffs 2048"): 2048 players,
  Registration Closed, playoff start already passed. The test user is ranked
  #1; fixture `P0001 S`… is ranked 2… (CP strictly decreasing). Home
  courts cycle London, Croydon, Birmingham, Coventry, Manchester, Salford,
  Leeds, Bradford (fixture n gets city n mod 8).
- Doubles ladder `maestro-po-doubles-ladder` ("Maestro Playoffs Doubles 256"):
  256 teams; the test user + `P0001 S` are team #1.
- "Generated" writes the bracket immediately with the same shared helpers as
  `processLadderPhases`; "Awaiting Function" leaves it to the deployed
  function (every 15 minutes, or force-run the Cloud Scheduler job
  `firebase-schedule-processLadderPhases-us-central1`). Maestro flows should
  use "Generated" — the function is covered by its Jest tests.

Before writing flows, add to the seed:

- a notification per seeded ladder ("open Maestro Playoffs 2048 on Playoffs",
  `type: "ladder"`, `data: { ladderId, tab: "Playoffs" }`) so flows can reach
  the ladder the same way the home-court flows do (Competitions →
  notifications → tap);
- a cancellation variant: a paid ladder with fewer than 128 participants, past
  `registrationClosesAt`, already set to Cancelled with reason "Too few
  registrations" (the client can't run the function, so write the cancelled
  state the function would produce), plus an upcoming variant (playoff start in
  the future) for the "not started" message.

Flows to cover (assert exact text):

1. **Singles bracket (Generated):** Playoffs tab shows the bracket
   (`ladder-playoffs-bracket`); first round header "Round of 128"; the test
   user's name appears in round 1; `P0127 S` appears and `P0128 S`
   does not (scroll/search the round). Rounds: Round of 128 → 64 → 32 → 16 →
   Quarter-Final → Semi-Final → Final, plus the 3rd-place playoff.
2. **Proximity pairing:** the test user (London home court) is paired with
   another London or Croydon player in round 1 (the seeded top 128 has 16
   players per city, so London and Croydon players only meet each other in
   the early rounds). Pin the exact opponent from the Generated seed's output
   before asserting it.
3. **Doubles bracket (Generated):** first round header "Round of 16"; the
   test user's team appears in round 1 with both player names.
4. **Not started:** upcoming ladder → `ladder-playoffs-empty` with "Playoffs
   haven't started yet" and "The top 128 players in the ladder qualify…" (or
   the matching top N for the seeded size).
5. **Cancelled:** cancelled ladder → "This ladder was cancelled" and "Too few
   registrations".
6. **Loading:** `ladder-playoffs-loading` shows before the bracket.
7. **Summary on a 2048 ladder:** Summary renders (no long stall); Top
   Contenders shows exactly 4 rows with the test user first; the
   Participants carousel shows at most 20 avatars.
8. **Tapping a bracket game does nothing yet** (Phase 2 adds the playoff match
   screen) — update this flow when Phase 2 lands.

Manual checks that Maestro can't do:

- After "Awaiting Function" + a force run: in the Firebase console
  `ladders/maestro-po-ladder` has `status: playoffs`, `playoffBracketSize: 128`,
  `playoffEntrantCount: 2048`, and `playoffTies` holds 128 docs. Force-running
  again changes nothing (idempotency).
