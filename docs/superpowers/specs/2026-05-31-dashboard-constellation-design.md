# Dashboard Constellation — Design Spec
**Date:** 2026-05-31  
**Status:** Approved

## Overview

Replace the tap-to-place prototype on the dashboard with a real constellation view showing the user's current group of 7 entries. Existing entries render as filled stars; remaining slots render as ghost stars so the user sees the final shape in advance. A mood picker lets the user add a new entry inline.

## Screens

### Dashboard (modified)
- Removes all tap-to-place logic
- Shows the current constellation: entries in the active group of 7
- Full ghost constellation always visible (all 7 slots computed from seed)
- Inline mood picker on „+" press

### Galaxy (unchanged)
- Keeps mock data for now; will show full history later

## Data Flow

**On mount:**
1. Read `galaxySeed` from storage (`getStoredSeed`)
2. `GET /entries/current` → array of `{ entryIndex, date, mood }` ordered by entryIndex
3. `GET /accounts` → `{ startYear }` (or include in `/entries/current` response)
4. Compute all 7 star positions from seed + first entry's date (or today if 0 entries)

**On „+" press:**
- Show mood picker (animated, inline)

**On mood select:**
1. `POST /entries { mood }` — backend sets date to today
2. Refetch `/entries/current`
3. New star animates from ghost → filled (spring scale)
4. Hide mood picker

## Shared Component: `ConstellationCanvas`

Extracted from `galaxy.tsx` rendering logic into `src/components/constellation-canvas.tsx`.

```
Props:
  seed: number
  entries: { entryIndex: number; date: string; mood: string }[]
  startYear: number
  width: number
  height: number
```

Renders:
- Dashed `Polyline` through all 7 ghost positions (full constellation outline)
- Solid `Polyline` through filled positions only (slots 0..filledCount-1)
- Ghost stars at all 7 positions (hollow circle, opacity 0.3)
- Filled stars on top of the ghost stars for occupied slots (white halo + core)

Center date: first entry's date if entries exist, otherwise today's date (`new Date().toISOString().slice(0, 10)`).

## Star Variants

**Filled** (existing entry): white core (7px) + lavender halo (22px, opacity 0.25) — same as galaxy.tsx  
**Ghost** (future slot): hollow circle outline only, stroke `Palette.brightLavender`, opacity 0.3, no fill

## Mood Picker

Component: `src/components/mood-picker.tsx`

```
Props:
  visible: boolean
  onSelect: (mood: Mood) => void
  onDismiss: () => void
```

Moods: `JOYFUL | CALM | NEUTRAL | ANXIOUS | SAD | ANGRY`

Layout: horizontal row of 6 buttons, each with emoji + label below. Animates in with `withSpring` from opacity 0 → 1 and translateY 20 → 0. Positioned above the „+" button. Dismissed on selection or tap outside.

Mood emoji mapping:
- JOYFUL → ✦
- CALM → ◉  
- NEUTRAL → ○
- ANXIOUS → ◈
- SAD → ◇
- ANGRY → ◆

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/entries/current` | — | `{ entries: Entry[], startYear: number }` |
| POST | `/entries` | `{ mood: string }` | `Entry` |

`Entry`: `{ entryIndex: number; date: string; mood: string }`

## Files Changed

| Action | Path | Change |
|--------|------|--------|
| Create | `src/components/constellation-canvas.tsx` | Shared canvas component |
| Create | `src/components/mood-picker.tsx` | Inline mood picker |
| Rewrite | `src/app/dashboard.tsx` | Remove tap logic, add fetch + picker |
| Modify | `src/app/galaxy.tsx` | Use `ConstellationCanvas` instead of inline rendering |

## Out of Scope
- Mood-based star colors (future)
- Pan/zoom on dashboard
- History view in galaxy (future)
- Edit/delete entries
