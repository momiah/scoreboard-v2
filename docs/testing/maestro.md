# Maestro E2E Testing

Maestro drives the real dev-client app on the iOS simulator (not Expo Go —
the app relies on custom native modules for video, blur, and the date
picker).

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
