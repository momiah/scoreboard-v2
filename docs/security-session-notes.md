# Security session notes

To start once every ladder phase is complete. Nothing here has been changed yet.

## Where things stand (checked 2026-10-17)

- **Live Firestore rules are fully open.** The rules published in the Firebase
  console (project `scoreboard-app-29148`, last published 14 Mar 2025) are:

  ```
  match /{document=**} { allow read, write: if true; }
  ```

  Anyone with the project ID (it ships inside the app) can read, change or
  delete any document without signing in and without the app.
- **`firestore.rules` in this repo is not what's live.** It denies everything.
  Deploying it would block every read and write and break the app, so never
  run a plain `firebase deploy`; always use `--only functions:...` until this
  session replaces the file with real rules.
- **The app writes its own results.** Scoring games, approvals, ladder CP and
  global XP, walkovers, dispute outcomes, team stats and match state are all
  written from the phone (client SDK transactions in `context/LadderContext.tsx`
  and friends). App-side checks only stop honest use.
- **Server-written so far:** `arrivals` on ladder matches (`recordLadderArrival`),
  the P − 1 standings close-out, playoff tie settlement and bracket generation,
  auto-approval, auto-expiry, auto-void.
- **No App Check.** The app uses the Firebase JS SDK, which can't do App Attest
  or Play Integrity on phones; it needs a native App Check module and a new
  native build.

## What's exposed today

- Fake games and approvals, and any player's CP, stats, rank or medals.
- Prize and ladder data (entry fees, prize pools, statuses, dates), playoff
  ties and brackets.
- Every user's profile, push tokens and notifications.
- Reports, disputes, strikes and disqualifications.
- Fake arrivals (so the location-checked no-show is only as strong as this).
- Deleting anything.

## Plan

1. **Require sign-in everywhere** (`request.auth != null`). The biggest, quickest
   win. First check what reads without signing in: the website's public pages,
   `ogPreview`, sign-up and username checks, anything run before login.
2. **Lock collections to owners and allowed fields.** Users edit only their own
   profile fields; players only the fields of their own matches that the flows
   need (check-in, reporting a game shell, chat); nobody writes `arrivals`,
   `standingsFinalisedAt`, ties, reports' status, strikes or prize data from
   the client. Admin writes (website) go through admin custom claims.
3. **Move score-changing writes to Cloud Functions:** game approval and scoring
   (ladder CP, global XP, team stats, match completion), dispute resolution,
   no-show walkovers, team creation and joins. The shared planners
   (`planLadderGameApproval`, `planDisputeResolution`, `planLadderWalkover`,
   `planReportStrikes`) already run on the server, so this is mostly moving the
   transaction behind a callable.
4. **App Check:** register iOS (App Attest, Apple Team ID) and Android (Play
   Integrity, SHA-256 signing fingerprint from `eas credentials` or Play Console)
   in the console; add the native module and enforce App Check on the callables
   and Firestore.
5. **Rules tests** with the emulator for every collection, and keep
   `firestore.rules` in the repo as the single source, deployed with
   `firebase deploy --only firestore:rules`.
6. **Payments** (Stripe) when they're built: server-only, webhooks verified.
