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

## Ladder cancellation and playoffs

Covered later by `maestro/seeds/seedLadderPlayoffs.js` (currently a stub):
under 128 entrants at registration close → Cancelled with the reason shown on
the Playoffs tab; 128+ → bracket appears in the Playoffs tab at playoff start.
