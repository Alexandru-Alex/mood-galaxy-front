# Galaxy History — Design Spec

**Date:** 2026-06-01
**Status:** Approved

## Problem

`ConstellationCanvas` renders a single constellation. There is no way to see past constellations. A new constellation starts every 7 journal entries (`constellationIdForEntry` groups by `Math.floor(entryIndex / 7)`), but history is never displayed.

## Goal

- `/dashboard` shows only the current constellation (unchanged)
- `/galaxy` shows all constellations across all time in a free pan+zoom galaxy view

## Architecture

### Component tree

```
galaxy.tsx
└── GalaxyView (pan+zoom container)
    └── ConstellationGroup × N  (one per constellation group)

dashboard.tsx
└── ConstellationCanvas (thin wrapper, unchanged externally)
    └── ConstellationGroup × 1
```

### New / modified files

| File | Change |
|------|--------|
| `src/components/constellation-group.tsx` | NEW — rendering logic extracted from `ConstellationCanvas` |
| `src/components/constellation-canvas.tsx` | Becomes thin wrapper; computes fixed view and renders one `ConstellationGroup` |
| `src/components/galaxy-view.tsx` | NEW — pan+zoom gesture container; renders N `ConstellationGroup`s |
| `src/app/galaxy.tsx` | Fetches `GET /entries`, groups by constellationId, mounts `GalaxyView` |
| `src/app/dashboard.tsx` | **Unchanged** |

## Data flow

### Entry fetching (`galaxy.tsx`)

`GET /entries` returns `{ entryDate, mood }[]` sorted chronologically. `entryIndex` is derived from array position, identical to the existing `toEntries` helper used in `dashboard.tsx`.

```ts
const allEntries = toEntries(data); // reuses existing helper

const groups = new Map<string, Entry[]>();
for (const entry of allEntries) {
  const cId = constellationIdForEntry(entry.entryIndex);
  if (!groups.has(cId)) groups.set(cId, []);
  groups.get(cId)!.push(entry);
}
```

`startYear` is derived from `allEntries[0].date`.

### Spatial positioning

Each constellation group uses the date of its first entry as the reference for `getConstellationCenter`, which maps:
- **angle** → month fraction of the year (Jan = top, cycling clockwise)
- **radius** → `baseRadius + yearIndex * ringGap` (each year is a new ring)

This means constellations from the same period of the year cluster together visually, and older years appear on outer rings.

## Components

### `ConstellationGroup`

Extracted from current `ConstellationCanvas`. Receives a pre-computed `view` instead of computing it internally.

```ts
type ConstellationGroupProps = {
  seed: number;
  constellationId: string;
  entries: Entry[];          // all entries belonging to this group
  startYear: number;
  view: GalaxyView;          // { centerX, centerY, zoom } — provided by parent
  canvasWidth: number;       // needed for aura SVG dimensions
  canvasHeight: number;
};
```

Renders: `ConstellationAura` (when `entries.length >= 7`), ghost polyline, solid polyline, `GhostStar`s, `FilledStar`s. No visual changes from current behaviour.

### `ConstellationCanvas` (modified)

Thin wrapper that computes a fixed view and delegates to `ConstellationGroup`:

```ts
const view = { centerX: width / 2, centerY: height / 2, zoom: 1 };
// renders one <ConstellationGroup> with this view
```

Dashboard import and behaviour unchanged.

### `GalaxyView`

Pan+zoom container using `react-native-gesture-handler` and `react-native-reanimated`. No external libraries needed beyond what is already installed.

```ts
type GalaxyViewProps = {
  seed: number;
  groups: Map<string, Entry[]>;
  startYear: number;
};
```

Internal state (shared values):
```ts
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);
const scale = useSharedValue(1); // clamped: 0.3 – 3.0
```

Gestures:
- `Gesture.Pan()` → updates `translateX`, `translateY`
- `Gesture.Pinch()` → updates `scale`
- `Gesture.Simultaneous(pan, pinch)` → both active at once

Computed view passed to each `ConstellationGroup`:
```ts
{
  centerX: width / 2 + translateX.value,
  centerY: height / 2 + translateY.value,
  zoom: scale.value,
}
```

Each `ConstellationGroup` is keyed by `constellationId` and positioned absolutely within the same canvas.

## Backend

No backend changes required. `GET /entries` returns `{ entryDate, mood }[]` sorted chronologically — the same shape as `/entries/current`. `entryIndex` is derived client-side from array position.

## What does NOT change

- `dashboard.tsx` — no modifications
- `ConstellationCanvas` public API — same props, same visual output
- All existing animations (`FilledStar` spring-in, `ConstellationAura` fade-in)
- `galaxyPositioning.ts` — no modifications
