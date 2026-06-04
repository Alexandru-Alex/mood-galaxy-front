# Void — Meditation Timer Feature Design

**Date:** 2026-06-04
**Status:** Approved

## Overview

A fullscreen meditation timer screen inspired by Forest.app, named "Void". The user selects a preset duration, then enters a fullscreen experience with an animated black hole (accretion disk) and a countdown timer. Once started, the session cannot be cancelled — the user must complete it. The feature lives as the 3rd (center) tab in the bottom navigation, represented by an animated spinning accretion disk icon that is larger than the other 4 icons.

---

## Screens

### Screen 1 — Select Duration

- Title: "VOID" (light weight, letter-spaced)
- Subtitle: "Enter the silence" (small caps, `#b9b3d6`)
- Small preview of the black hole animation (accretion disk, ~110px)
- Preset duration buttons: **5m, 10m, 20m, 30m, 60m**
  - Default selected: none (user must tap one)
  - Selected state: `rgba(87,74,226,0.35)` background, `#ab81cd` border, `#e2adf2` text
  - Unselected state: `rgba(34,42,104,0.6)` background, `rgba(171,129,205,0.3)` border, `#b9b3d6` text
- CTA button: "Enter Void" — gradient `#574ae2 → #654597`, disabled until a preset is selected
- Background: `SpaceBackground` gradient + `Starfield` component (reused from existing screens)

### Screen 2 — Active Session

- Fullscreen black hole animation (accretion disk, ~160px diameter)
- Large countdown timer: e.g. `08:43` — font weight 200, `#f3eefb`, letter-spaced, tabular nums
- Label below: "remaining" (small caps, `#b9b3d6`)
- Background: `SpaceBackground` + `Starfield`
- Other tabs remain navigable (user can go to Home etc.)
- While session is active, the Void tab icon shows a **pulsing ring** around it as a background indicator
- **No cancel button** — once started, cannot be stopped

### Screen 3 — Session Complete

- Triggered by: timer reaching 0 → haptic feedback + soft chime sound
- Faded/dimmed black hole (static, no rings, just glowing core)
- Text: "You emerged" (light weight, `#f3eefb`) + "from the void" (small caps, `#b9b3d6`)
- Session summary card (`rgba(34,42,104,0.5)` background, `rgba(171,129,205,0.2)` border):
  - Duration completed in large `#ab81cd` text
  - Label: "minutes in silence"
- CTA: "Back to galaxy" button (same gradient style)

---

## Navigation

- New 5th tab at position 3 (center): route `/void`
- File: `src/app/(tabs)/void.tsx`
- Icon: custom animated accretion disk (~42px, larger than other icons at 22px)
- Active/inactive: icon always animated; brightness/opacity indicates focus state
- Pulsing ring on icon when a session is running in the background

---

## Black Hole Animation (Accretion Disk)

Built with `react-native-reanimated` using `withRepeat` + `withTiming`.

Three rings rotating around a dark core:
- **Ring 1 (outer):** `width: 160px, height: 46px` — `rgba(171,129,205,0.75)` — 4s clockwise — `rotateX(70deg)`
- **Ring 2 (mid):** `width: 120px, height: 34px` — `rgba(226,173,242,0.45)` — 2.8s counter-clockwise — `rotateX(70deg)`
- **Ring 3 (inner):** `width: 80px, height: 23px` — `rgba(87,74,226,0.55)` — 2s clockwise — `rotateX(70deg)`
- **Core:** 44px circle, `background: radial-gradient(#050410 60%, #1a1340 100%)`, `box-shadow: 0 0 36px #ab81cd, 0 0 72px rgba(87,74,226,0.5)`

Nav icon version: proportionally scaled to ~42px container (ring1: 42×12px, ring2: 31×8.5px, core: 13px).

---

## Timer State

Timer state must persist across tab navigation. Use a **React Context** (e.g. `VoidContext`) that:
- Holds: `status` (`idle | selecting | running | complete`), `durationSeconds`, `remainingSeconds`, `startedAt`
- Runs a `setInterval` (or `AppState`-aware) countdown
- On completion: triggers `Haptics.notificationAsync` + plays chime sound via existing `audio-context`

---

## Sound & Haptics

- **Completion haptic:** `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` from `expo-haptics`
- **Completion sound:** A soft chime `.mp3` added to `assets/audio/`. Played via existing `useAudio` / audio context pattern already in the app.

---

## Theme Compliance

All colors from `constants/theme.ts`:
- `Palette.brightLavender` (`#ab81cd`) — accents, active states, glow
- `Palette.majorelleBlue` (`#574ae2`) — gradient, inner ring
- `Palette.dustyGrape` (`#654597`) — gradient end
- `Palette.mauve` (`#e2adf2`) — mid ring, highlights
- `Palette.imperialBlue` (`#222a68`) — card/button backgrounds
- Text: `#f3eefb` (primary), `#b9b3d6` (secondary)
- Background: `SpaceBackground` + `Starfield` (reuse existing components)

---

## File Changes

| File | Change |
|------|--------|
| `src/app/(tabs)/void.tsx` | New screen — selection + active + complete states |
| `src/components/app-tabs.tsx` | Add Void tab (position 3), custom disk icon, pulsing ring indicator |
| `src/components/black-hole.tsx` | New reusable animated accretion disk component (nav + fullscreen sizes) |
| `src/context/void-context.tsx` | New context for timer state |
| `assets/audio/chime.mp3` | New chime sound for session completion |

---

## Out of Scope

- Session history / statistics
- Custom duration input (only presets)
- Pause functionality
- Background audio / ambient sounds during session
