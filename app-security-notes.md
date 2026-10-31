# App security notes (Court Champs)

Handover notes for whoever picks up the security work. State as of 30 Oct 2026.
Firebase project: `scoreboard-app-29148`.

## 1. Firestore rules (top priority)
- **Live rules** (per Mo): `match /{document=**} { allow read, write: if true; }`. Anyone, signed in or not, can read and write every document.
- **Repo `firestore.rules`** is deny-all (`if false`), so it does **not** match live. Don't deploy it as-is; it would break the app. Write real rules, then deploy.
- **Goal:** no signed-out access to anything.
- **Sign-up needs** (`screens/Authentication/createAccount.ts`, `createCourtChampsAccount`):
  - A signed-in user creates their own `users/{uid}`: `request.auth.uid == uid`.
  - They also add their welcome notification at `users/{uid}/notifications/{id}`.
  - Consider limiting which fields a user can write on their own profile, e.g. no editing other users' stats or ranks.
- **`signupRateLimits/{id}`:** `allow read, write: if false;`. Only the Admin SDK in Cloud Functions uses it.
- **Signed-out sign-up no longer reads `users`:** email and username checks go through the callables below. Any rule that let signed-out clients query `users` can be removed.
- **Before writing rules:** audit every other collection the app touches (leagues, tournaments, games, gameVideos, notifications, etc.) for who reads and writes it.

## 2. Sign-up availability callables (deployed)
- **Files:**
  - `functions/src/signupAvailability.ts`
  - `functions/src/helpers/signupAvailabilityCore.ts` (pure logic, tested by `__tests__/auth/signupAvailabilityCore.test.ts`)
  - exported from `functions/src/index.ts`
- **`checkEmailAvailable({email})`:** Admin Auth `getUserByEmail`, returns `{available}`.
- **`checkUsernameAvailable({username})`:** queries `users` where `usernameLower == lower(username)`, returns `{available}`.
- **Input:** checked server-side (email max 254; username 4–10 characters, letters/numbers/single dashes).
- **Rate limit:** 60 calls per IP per 10 minutes, shared by both functions.
  - Counter doc is `signupRateLimits/{sha256(ip)}`, updated in a transaction.
  - IP comes from the first `x-forwarded-for` address.
  - Over the limit returns `resource-exhausted`.
- **App Check:** if `SIGNUP_ENFORCE_APP_CHECK` is true and the request has no App Check token, it is rejected with `failed-precondition`.
  - Set in `functions/.env` (gitignored by root `.gitignore` `.env`). **Currently `false`.**
  - **Deploying:** the setting defaults to `true` when `functions/.env` is missing. A deploy from a clean checkout or worktree switches enforcement on and rejects every sign-up check until App Check is set up. Copy `functions/.env` in before deploying, or deploy from a checkout that has it.
  - Last deployed 31 Oct 2026 from `claude/ladder-pre-registration` (`74b2083`), with `false`.
- **Client** (`createAccount.ts`) fails closed:
  - A username error counts as taken.
  - An email error throws `signup/email-check-failed`, shown as a toast, and sign-up stays on page 1.
- **Known accepted gap:** two simultaneous sign-ups can, very rarely, get the same username. The username is checked again just before the profile is saved, but it isn't atomic. Fully closing it needs a `usernames/{lower}` reservation written in a transaction. Mo accepted the gap.

## 3. App Check (code in place, console setup not done)
- **Client:** `services/appCheck.ts`, called in `App.js`.
  - react-native-firebase app and app-check 25.1.0. v26+ needs the New Architecture; the app has `newArchEnabled: false`.
  - Debug provider in `__DEV__`. Release: iOS App Attest with DeviceCheck fallback, Android Play Integrity.
  - The native token is passed to the JS SDK through `CustomProvider`.
  - Skipped in Expo Go.
- **`app.json`:**
  - Plugins `@react-native-firebase/app` and `@react-native-firebase/app-check`.
  - `expo-build-properties` with iOS `useFrameworks: static` and `forceStaticLinking [RNFBApp, RNFBAppCheck]`.
  - **iOS:** proven in an EAS development build on 31 Oct 2026 (`8358113`, build `55a37e50`).
  - **Android:** not built yet. `claude/ladder-pre-registration` is based on `main`, and Android only builds natively from `android-build`-based branches.
- **To do:**
  1. In the console, register iOS `com.courtchamp` with App Attest, plus DeviceCheck (needs an Apple DeviceCheck key).
  2. Register Android `com.courtchamp` with Play Integrity: link the Play Console and add the app signing SHA-256.
  3. Add debug tokens from development builds (shown in the Xcode/Logcat logs) under App Check → Manage debug tokens.
  4. Make new EAS builds (iOS and Android). These are native changes, so an over-the-air update won't deliver them.
- **Rollout order:**
  1. Release the app with App Check.
  2. Watch the App Check metrics in monitor mode.
  3. When most requests are verified, set `SIGNUP_ENFORCE_APP_CHECK=true` and redeploy the two functions.
  4. Optionally enforce App Check on Firestore, Storage and the other functions.

## 4. TTL for `signupRateLimits`
- The docs only store `{windowStart, count}` and are never deleted.
- To clean them up, add an `expireAt` Timestamp (e.g. `windowStart` + 1 day) in `enforceRateLimit` and create a Firestore TTL policy on `signupRateLimits.expireAt`.

## 5. Other observations
- **Other callables don't check who is calling:** none of `deleteVideo.ts`, `videoFunctions.ts` or `broadcastNotification.ts` reads `request.auth`.
  - `deleteVideo` checks ownership against `requestingUserId` sent in the request body, so anyone can pass someone else's id.
  - Fix: use `request.auth.uid`, and reject calls with no auth.
- **`firebase-admin` in the app's `dependencies`:** nothing in the app imports it (checked by grep). Move it out or remove it, and never ship Admin credentials in the client.
- **`app.json` `NSAllowsArbitraryLoads: true`:** allows plain HTTP on iOS. Tighten it if it isn't needed.
- **Values in the repo that are fine:** the Facebook client token, `GoogleService-Info.plist` and `google-services.json` are meant to be public. Security has to come from rules and App Check.
- **Social sign-in stores the session early:** `userToken` and `userId` are saved before the profile exists. A failed profile save rolls back (`rollBackSocialSignup`), but a crash part-way leaves an auth user with no profile.
- **Login with no profile document** goes Home with no user loaded. This predates the new flow.
- **Email check and enumeration:** `checkEmailAvailable` deliberately tells callers whether an email is registered. The protections against abuse are the rate limit and App Check.
- **Auth:** email verification is required before email/password login (enforced in `Login.js`; it resends the link). Password minimum is 6 characters; consider a stronger policy in Firebase Auth settings.
