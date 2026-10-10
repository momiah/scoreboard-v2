# Ladder Playoffs — Phase 2 and 3 notes

Agreed requirements and open decisions for the playoff match phase (Phase 2)
and payout (Phase 3). Phase 1 (bracket generation, Playoffs tab, cancellation
and promotion notifications) is done — see `functions/src/processLadderPhases.ts`.

## Agreed

### Matches
- Each playoff game (`ladders/{id}/playoffTies/{tieId}`) is decided on
  **aggregate over two matches: one at each side's home court** (home and
  away). Tapping a game in the Playoffs tab opens **PlayoffMatchDetailsScreen**
  (not AddTournamentGameModal). Both matches show as `MatchCard`s; tapping one
  opens the normal `MatchDetails`, where scores are reported, approved and
  disputed as today (only the opposing side can approve, decline or dispute).
- A qualifier without a home court gets the existing court picker on the
  playoff match screen; their home match can't be arranged until they pick one.
- **10 days per round** to complete both matches. The promotion notification
  already says so (`PLAYOFF_ROUND_DAYS` in `processLadderPhases.ts`; move it to
  shared when Phase 2 enforces it).
- The Schedule tab shows the gold ActionPlaceholder for a player with an open
  playoff game; it switches to the Playoffs tab, which scrolls to their game.

### Notifications
Sent by the backend (reuse `functions/src/helpers/sendNotification.ts`,
`type: "ladder"`, `data: { ladderId, tab }`):

| When | Recipients | Message | Opens |
|---|---|---|---|
| Ladder cancelled (done) | every entrant | "{ladder} has been cancelled because not enough players signed up before registration closed. If you paid an entry fee, it will be refunded to you in full." | Summary (Status reads Cancelled) |
| Bracket generated (done) | qualifiers | "Congratulations! You've made the playoffs in {ladder}. You have 10 days to play both your home and away games." | Playoffs (scrolls to their game) |
| Bracket generated, did not qualify (done) | every other entrant | "The playoffs in {ladder} have started, and unfortunately you didn't make the cut this time. The ladder is now closed, so you can no longer post matches. Thank you for playing, and come back next season for another chance to win!" | Playoffs (the bracket) |
| A side wins its game | the winners | "Congratulations! You've reached the {Round of 64 / 32 / 16 / Quarter-Finals / Semi-Finals / Final} in {ladder}. You have 10 days to play both your home and away games." | Playoffs |
| Ladder complete | every finisher | "Congratulations! You finished {1st / 2nd / 3rd / 4th / 5th–8th …} in {ladder} and won {prize money} and {prize CP}." (omit prizes they didn't win) | Summary |

### Who wins a prize
- **In the money = everyone who reaches the round after the first**, i.e. the
  top half of the bracket: 128 → top 64, 64 → top 32, 32 → top 16, 16 → top 8.
- **Exception — the 8-player bracket (128–255 registrations): all 8 are paid
  from the first round.** This matches `inTheMoney` in
  `courtchamps-shared/src/helpers/ladderPlayoffStructure.ts`.
- Finishing places: Final winner 1st, Final loser 2nd, 3rd-place playoff
  winner 3rd, loser 4th; then by the round a player went out in (Quarter-Final
  losers 5th–8th, Round of 16 losers 9th–16th, …).

## Open decisions (needed before building)

1. **Aggregate rule:** games won across both matches, or total points? Tiebreak
   if level: point difference, a decider, or the higher seed?
2. **Match format:** best of how many games per match — fixed or chosen?
3. **Scheduling:** who sets each match's date/time (home side proposes, away
   accepts?), and how the 10-day window is enforced.
4. **Order:** which match is played first (e.g. higher seed at home first)?
5. **Court fees:** home side pays the venue and the away side its share, as in
   normal ladder matches, or fee-free?
6. **Missed deadline / no-show:** walkover to the side that turned up; both out
   if neither plays?
7. **Prize split (Phase 3):** the current `LADDER_DISTRIBUTION` in
   `helpers/ladderPrizeDistribution.ts` pays only the top 4 (40/30/20/10%).
   It needs a split across every in-the-money place (e.g. per finishing band:
   1st, 2nd, 3rd, 4th, 5th–8th, 9th–16th, …) — decide the percentages and
   whether a shared band splits equally. Same for prize CP.
'''