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

## Ladder cancellation and playoffs

Covered later by `maestro/seeds/seedLadderPlayoffs.js` (currently a stub):
under 128 entrants at registration close → Cancelled with the reason shown on
the Playoffs tab; 128+ → bracket appears in the Playoffs tab at playoff start.
