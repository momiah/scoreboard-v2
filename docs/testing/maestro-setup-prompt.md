Task: set up Maestro E2E for the CourtChamps app and scaffold the reject-game (dispute) flow.

This is an Expo SDK 54 / React Native 0.81 app. We already have Jest integration tests; now I want Maestro flows I can run on the iOS simulator (and later Android). Do the following, checking each step works before moving on, and ask me before anything destructive.

1. Install Maestro (`curl -Ls "https://get.maestro.mobile.dev" | bash`), confirm `maestro --version`, and add a short `docs/testing/maestro.md` with the install + run commands you used.

2. Build a dev client so Maestro can launch the real app: `npx expo run:ios` (or `run:android`). Capture the resulting bundle id / app id — I'll need it in the flows. Do not use Expo Go (we have custom native modules: video, blur, date picker).

3. Create a `.maestro/` directory with:
   - `config.yaml` — app id, and an `onFlowStart` that logs in a seeded test user (ask me how auth works / for test credentials; do NOT hardcode real secrets — read them from env or a gitignored file).
   - `flows/` for the reject-game journeys below.
   - A `.maestro/README.md` explaining how to run one flow (`maestro test .maestro/flows/<file>.yaml`) and the whole suite (`maestro test .maestro/flows`).

4. Add the testIDs the flows need. The app already has many (`matchmaking-post-match`, `add-ladder-match-fee`, `matchmaking-card-<id>`, `add-ladder-match-terms`, …). The reject flow needs a few more — add `testID`s (never assert on styled visual state) to at least: the Accept/Decline buttons in `GameApprovalModal`, the dispute-composer submit + note input + evidence buttons in `GameDisputeScreen`, the Disputed pill in `FixtureGameItem`/`ScoreDisplay`, and the cancel-dispute control. Keep the naming convention already used in the repo (`kebab-case`, feature-prefixed).

5. Author these flows (one YAML each, from `docs/testing/reject-game-flow-test-plan.md` — read it first for the exact expected outcomes). Prefer seeding Firestore state over long UI setup where possible, and ask me how we seed a test ladder/match:
   - `reject-decline-opens-dispute.yaml` — reporter reports a game; opener taps Decline; assert the dispute composer opens (game is NOT deleted).
   - `reject-submit-note-dispute.yaml` — opener submits a note; assert the game shows the Disputed pill and is dimmed, and the timeline shows the opened phase.
   - `reject-duplicate-guard.yaml` — with an active dispute, assert Accept/Decline are locked and the disputed link opens the existing dispute.
   - `reject-video-min-duration.yaml` — assert a sub-1-minute dispute video is rejected and a 1-minute one is accepted (dispute min is 1 min, not 3).
   - `reject-cancel-dispute.yaml` — opener withdraws; assert the original game is restored/approved and the dispute closes.
   - `reject-completion-hold.yaml` — assert a match with an open dispute cannot complete until the dispute resolves.

6. Wire CI later (don't do it now): note in `maestro.md` that these can run on Maestro Cloud or a macOS CI runner, and that the dev build is a prerequisite there too.

7. Run the first flow (`reject-decline-opens-dispute.yaml`) against the simulator and iterate until it's green. Show me the run output. Then stop and let me review before doing the rest.

Constraints: don't commit secrets or test credentials; put throwaway seed data behind a clearly-named helper; follow the repo's existing branch / commit conventions (see `CLAUDE.md`); keep `npx tsc --noEmit` and `npm run lint` clean for any app-code changes (e.g. the added testIDs).
