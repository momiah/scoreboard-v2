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
   npm run shared                                                   # app
   cd functions && npm install courtchamps-shared@github:momiah/courtchamps-shared#main --force
   ```

Do not bake the lockfile bump in before the user confirms the shared PR is
merged (the pinned commit must exist on `main` first).

## Conventions

- Keep `npx tsc --noEmit` at 0 new errors vs the current baseline, and
  `npm run lint` at 0 errors, before committing.
- No pull requests unless explicitly asked (the shared PR above is the exception,
  since landing shared changes requires one).
- No explanatory code comments unless they are load-bearing or marking a stub.
