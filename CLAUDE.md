# Project memory — scoreboard-v2

## Shared-change workflow (courtchamps-shared)

`scoreboard-v2` (the app) and `scoreboard-v2/functions` both consume
`courtchamps-shared` as a git dependency pinned to `#main`.

When a change to `courtchamps-shared` is needed:

1. **Claude** makes the change on the shared branch, pushes, and opens a PR
   against `courtchamps-shared` `main`.
2. **The user** merges that PR and notifies Claude it is merged.
3. **Claude** then creates a **new commit on the mobile branch** with the shared
   change baked in — reinstall `courtchamps-shared#main` in **both** the app and
   `functions/` so both `package-lock.json` files pin the newly merged commit
   (plus any dependent mobile/functions code) — so the user only has to pull.

   ```
   npm run shared              # app node_modules + app package-lock.json
   ```

   `npm run shared` is app-only so the user can refresh their app without
   churning the functions lockfile. Bump the `functions/package-lock.json` pin
   yourself when baking — edit its one `courtchamps-shared` `resolved` commit in
   place (a surgical lockfile edit, not a reinstall, to avoid tree churn).
   `npm run shared:functions` exists but reinstalls and rewrites that lockfile,
   so prefer the in-place pin edit.

Do not bake the lockfile bump in before the user confirms the shared PR is
merged (the pinned commit must exist on `main` first).

## Conventions

- Keep `npx tsc --noEmit` at 0 new errors vs the current baseline, and
  `npm run lint` at 0 errors, before committing.
- Branch names must describe the feature (e.g. `claude/ladders-reject-game-flow`).
  Never push to a randomly generated session branch (e.g. `claude/stoic-keller-ergc6k`);
  continue the existing feature branch or create a descriptively named one,
  in every repo, including `courtchamps-shared`.
- Data backfills: write a client-SDK function in `devFunctions/` (using `db`
  from `services/firebase.config`, like `backfillLeagueCountryCode.js`) and
  expose it via a temporary `TouchableOpacity` on the Home screen for the user
  to tap. Do not write admin-SDK scripts that need gcloud or service-account keys.
- No pull requests unless explicitly asked (the shared PR above is the exception,
  since landing shared changes requires one).
- No explanatory code comments unless they are load-bearing or marking a stub.
- Naming: use `user` for the current user and `opponent` for the other
  player/team. Do not use `me`/`mine` or `them`/`theirs`.

## Firestore security rules

Before any security-rules work, read `docs/firestore-access-requirements.md`:
it lists every client write (app and website) the rules must keep allowing,
with who may write which fields. When a feature adds a new client write to
Firestore, add a row there in the same change.
