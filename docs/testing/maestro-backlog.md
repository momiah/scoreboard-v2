# Maestro backlog

Flows to add when the related feature is next under Maestro test. Remove an
entry once its flow exists.

## Team disbanding (doubles ladders)

The rule (`disbandTeam` in `context/LadderContext.tsx`, helpers in
`helpers/teamLadderActivity.ts`):

- A team **can** disband while every ladder it is in still has registration
  open and it has not completed (approved) a game in any of them.
- A team **cannot** disband once it has completed a game in a ladder that is
  still running. Games in other ladders, or in ladders that are completed or
  cancelled, don't count.
- A team **cannot** disband while any of its ladders has closed registration
  or is in playoffs.
- Once those ladders are completed or cancelled, the team can disband.

Flows to cover (singles has no leave option, so doubles only):

1. Registration open, no games played → Disband succeeds; the team is gone
   from the ladder and the participant count drops by one.
2. Registration open, a posted or accepted match but no approved game →
   Disband succeeds.
3. Registration open, one approved game in this ladder → "Can't disband"
   alert: completed a game in a ladder that's still running.
4. An approved game only in a different, completed ladder → Disband succeeds.
5. Ladder registration closed (and separately, in playoffs) → "Can't disband"
   alert: registration has closed.
6. Ladder completed → Disband succeeds.

## Ladder cancellation and playoffs

Covered later by `maestro/seeds/seedLadderPlayoffs.js` (currently a stub):
under 128 entrants at registration close → Cancelled with the reason shown on
the Playoffs tab; 128+ → bracket appears in the Playoffs tab at playoff start.
