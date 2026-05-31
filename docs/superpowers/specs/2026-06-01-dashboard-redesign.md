# Dashboard Redesign

**Date:** 2026-06-01
**Status:** Approved

## Overview

Redesign the dashboard screen to surface more context (date, greeting, progress) and position the mascot dynamically on the constellation. Add a persistent "+ Cum te simți" CTA and a mock bottom navigation bar.

---

## Layout

Three vertical zones inside the existing HUD overlay:

```
┌──────────────────────────────────┐
│ Monday, June 1    ·    4 / 7 ★  │
│ Good morning, Alex               │
├──────────────────────────────────┤
│                                  │
│        [constellation]           │
│        🧑‍🚀 ← at next star         │
│                                  │
├──────────────────────────────────┤
│      [ + Cum te simți ]          │
│   🏠          🌌          👤     │
└──────────────────────────────────┘
```

---

## Sections

### Top Row

`flexDirection: 'row'`, `justifyContent: 'space-between'`, aligned to the safe-area top.

**Left side (stacked):**
- Line 1: current date in English — `"Monday, June 1"` (no year)
- Line 2: time-based greeting + displayName — `"Good morning, Alex"`

**Right side:**
- When `entries.length < MAX_SLOTS`: `"4 / 7 ★"` (mauve, bold)
- When `entries.length >= MAX_SLOTS`: `"Constellation complete ✦"` (mauve, bold)

### Greeting Logic

| Hour range | Greeting |
|------------|----------|
| 05:00–11:59 | Good morning |
| 12:00–17:59 | Good afternoon |
| 18:00–21:59 | Good evening |
| 22:00–04:59 | Good night |

`displayName` comes from `GET /accounts` → `AccountDto`. On fetch error or while loading, greeting renders without the name (e.g., `"Good morning"`).

### Mascot

`astronaut-landing.png` rendered at ~60×52px, `position: 'absolute'`, centered on the next unfilled star's screen coordinates.

Position computed in `dashboard.tsx` using the same `galaxyPositioning` functions already used by `ConstellationCanvas`:

```ts
const nextSlotIndex = entries.length;
const mascotPos = nextSlotIndex < MAX_SLOTS ? allPositions[nextSlotIndex] : null;
```

Hidden (not rendered) when `mascotPos === null` (constellation complete).

### CTA Button

Pill-shaped `"+ Cum te simți"` button, always visible. Tapping opens the `MoodPicker`.

`canAdd = !submitting` — `MAX_SLOTS` no longer blocks the button. The backend enforces any hard limits.

### Mock Bottom Navigation

Three icon buttons: **Home**, **Galaxy**, **Profile**. No navigation wired — icons only. Rendered below the CTA button, spaced evenly in a row. Uses placeholder vector icons (e.g., `@expo/vector-icons` Ionicons).

---

## Data

| Source | Field | Used for |
|--------|-------|----------|
| `GET /accounts` | `displayName` | Greeting name |
| `GET /entries/current` | `entries`, `startYear` | Constellation + progress (existing) |

Both fetches run in parallel in `useEffect`.

---

## Files Changed

- `src/app/dashboard.tsx` — primary changes (layout, mascot, greeting, account fetch)
- No new components required for this scope
