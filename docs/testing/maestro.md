# Maestro E2E Testing

Maestro drives the real dev-client app on the iOS simulator (not Expo Go —
the app relies on custom native modules for video, blur, and the date
picker).

Every feature or behaviour change ships with its Maestro coverage in the same
PR: its flows, any seeds and harness section buttons with matching cleanup,
and a line in the table below. A PR without them isn't ready to merge.

## Flows

| Feature | Flows | Seeds / harness section |
|---|---|---|
| Ladders (reject-game, add/approve game, cancellation, check-in, home court, court submission, join, team, report player, freeze, info, playoffs, PROLevel) | `reject-*`, `add-game-*`, `approve-game-*`, `cancel-*`, `checkin-*`, `court-*`, `home-court-*`, `join-ladder-*`, `team-*`, `report-player-*`, `dispute-*`, `disqualified-*`, `ladder-*`, `match-chat-room-*`, `profile-prolevel-*`; test plans in `docs/testing/*-test-plan.md` | `maestro/sections/ladders.tsx`, `maestro/seeds/*`, `maestro-cleanup-ladder-test-data` |
| Ladder playoff prizes and finishing places | `ladder-playoffs-guide-pages` (the How to Play Prize Distribution page lists 1st, 2nd, 3rd, 4th, then Joint 5th and each later round as Joint Nth, with no round names; the free playoff ladder pays linearly, so its table ends at Joint 9th, and the paid one progressively, ending at Joint 5th), `ladder-playoffs-journey-{final,third}-{win,loss}` and `ladder-playoffs-doubles-journey-final-win` ("You finished 1st" … "4th" notifications and their prizes), `ladder-playoffs-journey-{qf,r16,decider}-loss` (knock-out prizes: a free-ladder Round of 16 loser wins CP, a paid one nothing), `ladder-playoffs-journey-arrange`, `ladder-playoffs-prize-banner` and `ladder-summary-prize-pool` (tie payouts and pools). Every amount and label comes from the shared prize helpers through `maestro-expected-po{,-paid,-doubles}-prizes` (`maestro/seeds/playoffPrizeExpected.js`); `ladder-playoffs-held-prize-notice` (after the test user loses their Quarter-Final, a held prize shows on Summary as "Your prize for finishing joint 5th (…) is under review", never "8th") | `maestro-seed-journey*`, `maestro-seed-playoff-match*`, `maestro-mock-po{,-paid}-held-prize-qf` (`maestro/seeds/mockLadderHeldPrize.js`); ladders get `payoutStructure` from `maestroPlayoffPayoutStructure` in `maestro/seeds/seedLadderPlayoffs.js`; `maestro-cleanup-ladder-test-data`, which also deletes `prizePayouts` |
| Ladder season start: matches closed until the season starts, the pre-season notice and countdown on Summary, the moved-back start, the season-started and cancelled-before-start notifications, How to Play and Rules copy | `ladder-season-*` | `maestro-seed-season-start-{pre-season,extended,started,cancelled}` in `maestro/sections/ladders.tsx` (`maestro/seeds/seedLadderSeasonStart.js`), removed by `maestro-cleanup-ladder-test-data` |
| Ladder double booking | `double-booking-accept-blocked-by-a-match-on-another-ladder` (accepting a singles match is refused while the player has a doubles match on another ladder inside the clash window), `double-booking-accept-allowed-when-the-other-match-is-later` (a match a full window later does not block). Posting, playoff arranging and rescheduling run the same check; the rule itself is unit-tested in `helpers/ladderMatchClash.test.js` and `context/LadderContext.test.tsx`. | `maestro-seed-double-booking-clash` / `-clear` in `maestro/sections/ladders.tsx` (`maestro/seeds/seedDoubleBookingFlow.js`, window from `LADDER_MATCH_CLASH_WINDOW_MINUTES`); `maestro-cleanup-ladder-test-data` |
| Ladder terms and rules (text from `courtchamps-shared` `src/legal`) | `ladder-info-rules-and-terms-screens`: the ladder menu opens Rules and Terms, and the Terms show 11. Chargebacks & payment disputes, followed by 12. Court fees; `ladder-legal-rules-content`: the Rules version line, How the standings work, the playoff places table (first row starts at the minimum entrants), Playing to win and the Prizes line; `ladder-legal-terms-content`: the Terms version line, 1. Who we are with the contact email, 18+ eligibility, the Linear and Progressive payout tables, the cancelled-ladder refund including the platform fee, Complaints with the support reply hours, and Governing law. Numbers come from the `MAESTRO_*` env `run-suite.sh` exports (`MAESTRO_TERMS_VERSION`, `MAESTRO_PLATFORM_FEE_PERCENT`, `MAESTRO_SUPPORT_REPLY_HOURS`, `MAESTRO_CONTACT_EMAIL`) | `maestro-seed-cancel-accepted`; `maestro-cleanup-ladder-test-data` |
| Terms of Use | `profile-terms-of-use`: Profile Settings lists Terms of Use and Privacy Policy, and Terms of Use shows the version line, its sections and the Privacy Policy link | none (no data) |
| Chats tab | `chats-tab-*` | `maestro-seed-chats-*` in `maestro/sections/ladders.tsx` (`seedChatsTab` uses the ladder cancellation seed) |
| Core harness | `core-harness-unlock-and-sign-out` | `maestro/sections/core.tsx` (`maestro-sign-out`), `maestro-cleanup-test-data` |
| Free-ladder location check (join) | `join-ladder-singles-out-of-area-blocked-then-near-joins` (refused in Manchester with the radius from `maestro-expected-joinRadiusMiles`, then joins at the court); `ladder-join-payment-stub` (paid ladders show no rule); every free-ladder join flow runs `utilities/ladders/near-eligibility-court.yaml` | `maestro-seed-join-singles-*` etc. list `maestro-eligibility-court` (`maestro/seeds/ladderEligibilityFixtures.js`); `maestro-cleanup-ladder-test-data` deletes the court and the test user's `ladderEligibility` docs. Android emulators are put at the court by `run-suite.sh`. |
| Free-ladder inactivity removal | `ladder-inactivity-warning-notification` (the 3-day warning opens Matchmaking while the user is still in), `ladder-inactivity-removed-notification` (the removal notice, 14 days before registration closes, opens a Summary that shows Removed for inactivity instead of Join or Participant). The scheduled job itself (removal 14 days before close, warnings 7/3/1 days before that once the season has started, the 14-day grace for late joiners, removal of singles and doubles with their location checks, cancelled open matches, paid ladders untouched) and the join callable refusing removed players is covered by `functions/src/ladderInactivity.emulator.test.ts`. | `maestro-seed-inactivity-warning` / `-removed` in `maestro/sections/ladders.tsx` (`maestro/seeds/seedLadderInactivity.js`, copy from the shared `getLadderInactivityWarning` / `getLadderInactivityRemoval` / `LADDER_INACTIVITY_REMOVED_LABEL`); `maestro-cleanup-ladder-test-data` |

## Install

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME/.maestro/bin"   # add to ~/.zshrc if not already there
maestro --version
```

## Build the dev client

Maestro needs a real build to launch, not the Expo Go sandbox:

```bash
npx expo run:ios
```

This installs a dev-client build on the booted simulator. Note the bundle
id it builds under — the flows' `config.yaml` needs it as `appId`.

## Run flows

```bash
maestro test .maestro/flows/<file>.yaml   # one flow
maestro test .maestro/flows               # whole suite
```

See [.maestro/README.md](../../.maestro/README.md) for how login and seed
data are wired into these flows.

## CI (not set up yet)

These flows can run headless on Maestro Cloud or a macOS CI runner. Either
way the dev-client build (`npx expo run:ios`) is a prerequisite step before
`maestro test` can launch the app — there's no CI wiring for this yet.
