# Constellation Rendering — Design Spec
**Date:** 2026-05-31  
**Status:** Approved

## Overview

Add a new `galaxy` screen that draws deterministic star constellations using a per-user seed received at login. Stars are white for now; mood-based colors come later. The existing tap-to-place dashboard is untouched.

## Positioning Formula

The pure functions in `galaxyPositioning.ts` (provided by user) handle all geometry:

- `generateConstellationShape(galaxySeed, constellationId)` — 7 normalized points in local space (~-1..1)
- `constellationIdForEntry(entryIndex)` — maps entry index to constellation id (every 7 entries = 1 constellation)
- `slotForEntry(entryIndex)` — which of the 7 points this entry occupies (0..6)
- `getConstellationCenter(date, startYear)` — macro position: angle = time of year, radius = year index
- `starScreenPosition(center, shapePoint, view, slotRadius)` — final `{x, y}` in screen coords

Inputs that come from the backend (at login or entry fetch):
- `seed` — integer, one per user, set at signup
- `startYear` — the year the user joined
- `entries` — array ordered oldest-first, each with a `date` field

## Files Changed

### New files
| File | Purpose |
|------|---------|
| `src/lib/galaxyPositioning.ts` | Formula utilities, TypeScript port of provided JS |
| `src/app/galaxy.tsx` | New screen — reads seed from storage, renders galaxy with mock entries |

### Modified files
| File | Change |
|------|--------|
| `src/lib/api.ts` | Add `saveGalaxySeed` / `getStoredSeed` helpers (SecureStore + localStorage) |
| `src/app/landing.tsx` | Store seed after Google auth success |
| `src/components/auth-modal.tsx` | Store seed after email sign-in/sign-up success |
| `src/app/_layout.tsx` | Register `<Stack.Screen name="galaxy" />` |

## Seed Storage

Same pattern as the auth token:
- **Native:** `SecureStore.setItemAsync('galaxy_seed', String(seed))`
- **Web:** `localStorage.setItem('galaxy_seed', String(seed))`

The backend login response shape becomes: `{ token: string; newUser: boolean; seed: number }`.

## Galaxy Screen (`galaxy.tsx`)

```
view = { centerX: width/2, centerY: height/2, zoom: 1 }
startYear = 2026
mock entries = 14 entries (2 full constellations)
  c0: dates Jan–Feb 2026  (entries 0–6)
  c1: dates Mar–Apr 2026  (entries 7–13)
```

**Render layers (bottom to top):**
1. `SpaceBackground` — existing dark gradient
2. `Starfield` — existing ambient stars
3. Single full-screen `<Svg>` — one `<Polyline>` per constellation connecting stars in slot order
4. Absolute-positioned `Star` components (white, same as existing `Constellation`) at computed `{x, y}`

**Constellation center date:** first entry in the group (entry 0 for c0, entry 7 for c1).

## Out of Scope (this spec)
- Pan / zoom gestures
- Mood-based star colors
- Real entry data from backend (mock only for now)
- Navigation to the galaxy screen from dashboard
