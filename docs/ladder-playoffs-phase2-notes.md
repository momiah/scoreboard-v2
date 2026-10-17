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
| Bracket generated (done) | qualifiers | "Congratulations! You've made the playoffs for {ladder}. You have N days to play your next round." (N is `LADDER_PLAYOFF_TIE_DAYS`) | Playoffs (scrolls to their game) |
| Bracket generated, did not qualify (done) | every other entrant | "The playoffs in {ladder} have started, and unfortunately you didn't make the cut this time. The ladder is now closed, so you can no longer post matches. Thank you for playing, and come back next season for another chance to win!" | Playoffs (the bracket) |
| A side wins and the next tie starts straight away (done) | the winners who just finished | "Congratulations, you're through to the {round}!": "Congratulations! You've made it to the {round} in {ladder}. You have N days to play your matches." | Playoffs |
| A side wins and its next opponent isn't known yet (done) | the winners | "Congratulations, you're through to the {round}!": "You're through to the {round} in {ladder}! We'll let you know as soon as your opponent is decided." | Playoffs |
| Both matches level (done) | both players | "You have a deciding game left to play": "You have a deciding game left to play as your matches in the {round} of {ladder} resulted in a draw!" | Playoffs |
| A posted playoff match goes 24 hours unanswered (done) | both players | Away side: "You didn't reply within 24 hours, so playoff match N at {court}, {date} has been accepted for you." Host: "Your opponent didn't reply within 24 hours, so … has been accepted for them." | Playoffs |
| The waiting side's opponent is decided (done) | the side that was waiting | "Your {round} opponent is decided": "Your {round} against {opponent} is ready! You have 10 days to complete both matches" | Playoffs |
| A tie is lost before the Semi-Finals (done) | the losers | "You've been knocked out in the {round} of {ladder}." + "You've been awarded {prize}, paid when the playoffs finish." when they won something | Playoffs |
| A Semi-Final is lost (done) | the losers | "You'll play for 3rd place" (opponent not known yet), then "Your Semi-Final in {ladder} is over, and you'll play for 3rd place against {opponent}. You have 10 days to complete both matches" (the side that just arrived) and "Your Semi-Final in {ladder} is over, and your 3rd-place tie against {opponent} is ready! You have 10 days to complete both matches" (the side that was waiting) | Playoffs |
| The Final / 3rd-place tie finishes (done) | its four players | "Congratulations, you have placed {place} in {ladder} and been awarded {prize}." (prize part only when won); the ladder is marked Completed once both finish | Summary |
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

## Decided (Phase 2, built)

1. **Aggregate:** games won across both matches. Level → one deciding game,
   created at the court, time and check-in of whichever match was played last.
2. **Format:** best of 7 per match.
3. **Scheduling:** the host picks court and time; the away side accepts or
   declines, once. Either side can offer to play match 2 straight after match
   1 at the same court ("Play match 2 here"); that decline doesn't count.
4. **Order and hosting:** the lower-ranked side hosts and arranges match 1
   first; once it's arranged, match 2 (higher-ranked host) can be arranged for
   any date, even earlier. No coin toss.
5. **Court fees:** none on playoff matches.
6. **Deadline:** 10 days per round. When time runs out the game is decided on
   games won, then points, then ladder rank; if nothing was played neither side
   goes through and the next opponent gets a walkover.
7. **Prizes:** the whole entry fee goes into the cash pot and the 10% platform
   fee is paid on top (£20 + £2). Cash and CP both follow the shared
   `LADDER_PAYOUT_STRUCTURE` (courtchamps-shared #53, #61): whole amounts per
   place, bands split equally, leftovers to the champion
   (`helpers/ladderPlayoffPrizes.ts`). The tie card shows the current payout
   and the next round's; the guide's page 3 shows the full table.

8. **Season close:** posting closes 7 days before playoffs, results 5 days
   before (no game or no-show reports on regular matches; extensions end there
   too), and the standings are final 1 day before: open disputes are discarded,
   no-show claims are awarded only when the recorded arrivals show the claimant
   at the court and the opponent not (and the claimant isn't flagged), and
   unfinished matches expire keeping their approved games. Admins decide until
   then; the admin site locks afterwards. Playoffs generate on the day with no
   hold.
9. **Arrivals:** `recordLadderArrival` records a player at the court from a
   fresh reading (mocked, stale, inaccurate or distant readings refused) when
   check-in's location check passes and when a no-show is reported. A no-show
   can't be reported once the opponent has arrived.

## Phase 3 (not started)

- Pay out cash and CP to every paid place once the ladder is Completed (the
  Final and 3rd-place tie finishing already marks it and sends the placement
  notifications; the payout is only logged), then mark it `prizesDistributed`.
- Real payments: charge the £22 at join, refunds (`refundLadderEntryFees` is a
  stub), and payouts through the payment provider.
