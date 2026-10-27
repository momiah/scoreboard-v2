# Ladder device-size and font-size test plan

Purpose: confirm the ladder feature (registration, matches, playoffs) works and looks right on small, standard and large phones, and with large system fonts, on both iOS and Android. The functional Maestro suites already pass on one device per platform (iPhone 16 Pro Max and 16 Pro, Pixel 9 Pro emulator); this plan covers what they cannot: layout that changes with screen size.

Run it once the whole ladder feature is merged to `main` (iOS) and `android-build` (Android).

## Why this is a separate pass

- The Maestro flows found size-sensitive spots: the "Arrange your home match" card sits under the tab bar on an iPhone 16 Pro but not on a Pro Max; on Android, off-screen elements are missing from the accessibility tree, so a layout that needs scrolling on a small phone behaves differently from a tall one.
- Bugs already found by device differences: Match Details burger under the Android status bar, Player Details back arrow under the status bar, chat input hidden behind the Android keyboard, bracket crash on very large brackets.
- The Android functional run uses a very tall virtual display (`adb shell wm size 1280x5600`) so every element is on screen. That hides small-screen problems on purpose, so those problems must be looked for here.

## Device matrix

| Platform | Small | Standard | Large |
|---|---|---|---|
| iOS | iPhone 16e (or SE) | iPhone 16 Pro | iPhone 16 Pro Max |
| Android | Pixel 4a (5.8", 1080x2340) | Pixel 8 or 9 (6.2"–6.3") | Pixel 9 Pro XL (6.8") |

Font settings, run the standard device again at each:

| Platform | Default | Large |
|---|---|---|
| iOS | Medium | `xcrun simctl ui <UDID> content_size accessibility-extra-large` |
| Android | font scale 1.0 | `adb shell settings put system font_scale 1.3` (and 1.5) |

Android also: reset the display first with `adb shell wm size reset` and `adb shell wm density reset`.

## Flow subset (about 20, each run on every device in the matrix)

Arrange and schedule
- `ladder-playoffs-journey-arrange`
- `ladder-playoffs-arrange-home`
- `ladder-playoffs-reschedule`
- `ladder-playoffs-doubles-user-arranges`
- `ladder-playoffs-confirm-match`

Tie screen and bracket
- `ladder-playoffs-round-structure`
- `ladder-playoffs-bracket-view-toggle`
- `ladder-playoffs-cutoff-256`, `-512`, `-2048`
- `ladder-playoffs-tap-game-opens-match`
- `ladder-playoffs-tie-layout-spectator`
- `ladder-playoffs-tie-chat`
- `ladder-playoffs-prize-banner`

Match and results
- `ladder-playoffs-report-score`
- `ladder-playoffs-journey-decider`
- `ladder-playoffs-journey-final-win`
- `add-game-report-score`
- `approve-game-accept-score`

Other
- `join-ladder-singles-success`
- `ladder-playoffs-guide-pages`

Run notes
- Run one Maestro process per device. Use `MAESTRO_DEVICE=<UDID or emulator-5554> .maestro/run-suite.sh "=<flow-name>"` for an exact flow, or a substring for a group.
- On Android, harness buttons are far down the Home list; `utilities/playoffs/harness.yaml` scrolls to them. On a small phone, scrolling takes longer.
- A failure that says an element is not found on Android usually means it is below the fold: scroll first, then assert. A failure on iOS that taps the wrong thing usually means the target is under the tab bar: scroll it to the centre first.
- Seeds create data for whichever account is logged in; the end-of-testing cleanup must run for each account on each platform.

## Manual checklist (about 15 minutes per device)

Look at each screen at default font and at the large font. Nothing may be cut off, overlap, or be unreachable.

1. Home and Competitions: header, bell and badge, the ladder card.
2. Ladder Summary: top contenders, current position, home court card, "About this ladder".
3. Ladder Rules, Terms and How to Play: paragraphs readable, nothing clipped.
4. Join flow: team selection, terms checkbox, confirm button visible above the keyboard.
5. Playoffs tab: tree view (round tabs, connector lines, scroll between rounds) and list view; "How to play playoffs" button.
6. Tie screen: header and prize banner, aggregate card, match cards, "Arrange your home match" card reachable without a hidden button, winner and "not played" banners.
7. Arrange sheet: court, date, time stepper, best-of, shuttle type, terms, submit — all reachable with the keyboard open.
8. Date picker: range message, wheel and confirm button (Android uses the in-app date wheel).
9. Match Details: burger menu opens, check-in, games list, report and approve buttons, game screen approval controls.
10. Chat: input and send button stay above the keyboard; long messages wrap.
11. Notifications list: long messages wrap; tapping opens the tie screen.
12. Player and Team Details screens: back button reachable.

Android only: gesture navigation and 3-button navigation, status bar overlap on a device with a camera cutout, keyboard open on every input screen.

## Pass criteria

- Every subset flow passes on every device, or the failure is explained as an automation limit and the same step is checked by hand.
- Every manual-checklist screen passes at default and large font.
- Anything cut off, overlapping or unreachable is logged with the device, the font setting and a screenshot, and fixed before launch.

## Known limits

- Real push notifications on a physical phone are not covered by any simulator test.
- The location check (arrival at the court) is seeded in Maestro, not exercised with a real GPS fix.
- Physical-device behaviour (notch shapes, manufacturer skins on Android) cannot be reproduced on a simulator; do a final check on at least one real iPhone and one real Android phone.
