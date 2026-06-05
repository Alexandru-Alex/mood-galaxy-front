# Onboarding & Constellation Celebration — Design Spec

**Date:** 2026-06-05
**Status:** Approved

---

## Overview

Two connected features for new users:

1. **First-launch onboarding** — a single fullscreen splash that explains the core concept ("moods become stars") and gets the user to their first star within 30 seconds.
2. **Constellation completion celebration** — a gentle inline celebration when a user completes their 7th star in a constellation. No streaks, no aggressive nudges — just a quiet dopamine moment.

---

## Feature 1 — Onboarding Splash

### What it is

A fullscreen `Modal` overlay that appears on first app open, on top of the existing Home screen. Home renders normally behind it. The modal is shown exactly once, controlled by a `onboarding_complete` flag in SecureStore (same pattern as the existing `is_new_user` flag in `src/lib/api.ts`).

### Screen content

- Background: space gradient + starfield (same as the rest of the app)
- Center: animated `✦` icon with soft aura glow behind it
- Title: **"Your moods become stars"**
- Subtitle: **"Every feeling you log lights up a star in your personal galaxy. 7 stars form a constellation."**
- Primary CTA button: **"✦ Log your first mood"** — styled as the existing bordered `addBtn` from Home (transparent background, `brightLavender` border, uppercase, `borderRadius: 32`)
- Top-right: **"Skip"** text link (same result as tapping CTA — sets flag, dismisses, does not open modal)

### Behavior

- CTA tap → sets `onboarding_complete` in SecureStore → dismisses splash → calls `bottomSheetRef.current?.present()` to open JournalSheet immediately
- Skip tap → sets `onboarding_complete` → dismisses splash only (no modal)
- Back button (Android) → same as Skip
- If `onboarding_complete` is already set → splash never mounts

### Entry animations (sequential, on mount)

| Element | Animation |
|---|---|
| `✦` icon | `scale` 0 → 1, spring (damping 12, stiffness 120) |
| Aura glow | `opacity` 0 → 1, timing 600ms |
| Title | `translateY` +16 → 0 + `opacity` 0 → 1, timing 350ms, delay 150ms |
| Subtitle | same, delay 280ms |
| Button | same, delay 400ms |

---

## Feature 2 — Constellation Completion Celebration

### What it is

An inline celebration that appears on the Home screen the moment the user submits their 7th mood in a constellation. No fullscreen overlay — everything happens on the existing screen.

### Trigger

Detected in `HomeScreen` after React Query refetches `['entries', 'current']`:

```
currentEntries.length === MAX_SLOTS (7)
```

Tracked via a `useRef<string | null>` (`celebratedConstellationId`) that stores the ID of the last constellation that was celebrated. On each render, if `currentCId !== celebratedConstellationId.current && currentEntries.length === MAX_SLOTS`, trigger the celebration and set `celebratedConstellationId.current = currentCId`. This survives re-renders and re-mounts without false re-triggers, and automatically resets when the user starts a new constellation.

### Visual components

**A — Aura burst on the constellation**

The existing `ConstellationCanvas` already renders an aura when a constellation is complete (via `blendMoodColors` in `constellation-group.tsx`). On completion, this aura does a single pulse:

- `opacity`: existing value → +0.3 → back to existing value, timing 800ms, `Easing.out(Easing.quad)`
- This reuses the existing aura infrastructure — no new SVG or canvas work needed.

**B — Sparkle particles**

4 small `✦` text elements positioned around the constellation center, each with a unique mood color from the completed 7 entries:

- `opacity`: 0 → 1 → 0, timing 1200ms
- `translateY`: 0 → −12px, timing 1200ms
- Staggered: 0ms, 80ms, 160ms, 240ms offsets

**C — Completion banner**

A small pill-shaped banner that slides up from below the constellation area:

- Content: `✦ Constellation complete` (title) + `7 moods · [View in galaxy →]` (subtitle with tappable link)
- Style: `background: rgba(91,58,185,0.2)`, `border: 1px solid rgba(139,105,235,0.35)`, `borderRadius: 12`
- Animation: `translateY` +20 → 0 + `opacity` 0 → 1, spring (damping 18, stiffness 160), delay 400ms after trigger
- Auto-dismiss: after 5 seconds, reverses animation and unmounts
- Tap: navigates to Galaxy tab (`router.push('/(tabs)/galaxy')`) and dismisses

**D — Constellation shape in banner**

The banner includes a miniature render of the completed constellation's **real generated shape**, using `generateConstellationShape(seed, currentCId)` to get the 7 point positions. Rendered as a small SVG (~60×60px) beside the text: all 7 stars lit with their actual mood colors, polyline connections between stars visible. This is not a generic icon — each celebration looks different.

### What does NOT happen

- No fullscreen overlay or modal
- No streak counter or "keep it up" language
- No sound (respects the existing `isMuted` AudioContext)
- No push notification
- Haptic: one short `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on trigger (same as existing patterns)

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `src/components/onboarding-splash.tsx` | Fullscreen splash Modal, entry animations, CTA/Skip logic |
| `src/components/constellation-celebration.tsx` | Sparkles + banner, auto-dismiss logic |

### Modified files

| File | Change |
|---|---|
| `src/lib/api.ts` | Add `getOnboardingComplete(): Promise<boolean>` and `setOnboardingComplete(): Promise<void>` helpers (SecureStore on native, localStorage on web — same pattern as existing `getStoredToken`) |
| `src/app/(tabs)/index.tsx` | Mount `<OnboardingSplash>` (conditional on flag), mount `<ConstellationCelebration>` (conditional on trigger), pass `bottomSheetRef` to splash |

### No backend changes

All logic is client-side. Trigger detection is based on existing React Query data. Storage uses the existing SecureStore/localStorage abstraction.

---

## Out of scope

- Multi-step walkthrough / swipeable slides
- Per-tab tooltip coach marks
- "First star" celebration (only constellation completion is celebrated)
- Streak tracking or any form of gamification pressure
- Onboarding re-entry or reset UI
