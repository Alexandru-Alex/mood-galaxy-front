# Galaxy Performance Optimization — Design Spec

**Date:** 2026-06-02  
**Status:** Approved

## Problem

With ~146 constellations (~1025 entries ÷ 7), the galaxy screen is slow to load and causes jank in other tabs after navigation. Two root causes:

1. **Infinite animations run in the background.** Expo Router keeps tab screens mounted. `StarGroup` (12 instances) and each visible `ConstellationGroup` run `withRepeat(..., -1)` animations forever, even when the user has switched to another tab.

2. **~30 concurrent fetches trigger ~30 cascading re-renders at startup.** `handleVisibleMonthsChange(allSummaryMonths.current)` fires all month fetches simultaneously. Each resolves independently and calls `setGroups`, triggering a full re-render with expensive `useMemo` recalculations (`positions` and `monthGroups` over 146 entries) each time.

Secondary issues:
- `visibleGroups` is computed inline on every render without `useMemo`.
- `ConstellationGroup` has no `React.memo` wrapper, so re-renders on every `groups` update even if its own entries didn't change.

## Design

### Fix 1 — Pause animations when the screen loses focus

Add an `active` boolean prop to `Starfield` and pass it through `GalaxyView` to `ConstellationGroup`.

In `galaxy.tsx`, use `useFocusEffect` from `expo-router` to track whether the galaxy tab is focused, storing the result in a `useRef`-backed state value passed down as `active`.

Each component that runs a `withRepeat` animation reacts to `active` in a `useEffect`:
- When `active` becomes `false`: call `cancelAnimation(sharedValue)`.
- When `active` becomes `true`: restart the animation.

**Components changed:** `galaxy.tsx`, `starfield.tsx` (`StarGroup`), `constellation-group.tsx`.

**Expected impact:** eliminates post-navigation jank. Other tabs become immediately smooth after switching away from galaxy.

### Fix 2a — Batch `setGroups` updates with an accumulator

Replace the per-fetch `setGroups` call with an accumulator pattern:

- Add a `pendingUpdates` ref (`Map<string, Entry[]>` keyed by `constellationId`) in `galaxy.tsx`.
- Add a `batchTimer` ref (`ReturnType<typeof setTimeout> | null`).
- When a month fetch resolves, merge its entries into `pendingUpdates` instead of calling `setGroups` directly.
- Schedule a `setTimeout(flush, 0)` if none is pending. `flush` reads `pendingUpdates`, clears it, and calls `setGroups` once with the merged result.

This collapses multiple fetches that resolve within the same event-loop tick into a single render. In practice, concurrent network responses reduce ~30 renders to 3–5.

**Components changed:** `galaxy.tsx`.

### Fix 2b — Memoize `visibleGroups`

In `galaxy-view.tsx`, wrap the `visibleGroups` computation in `useMemo`:

```ts
const visibleGroups = useMemo(
  () =>
    [...groups.entries()].filter(([cId]) => {
      const pos = positions.get(cId);
      if (!pos) return false;
      return isVisible(pos.cx, pos.cy, cull, width, height);
    }),
  [groups, positions, cull, width, height],
);
```

**Components changed:** `galaxy-view.tsx`.

### Fix 2c — `React.memo` on `ConstellationGroup`

Wrap `ConstellationGroup` with `React.memo` using a custom comparator that considers the component unchanged when `constellationId` and `entries.length` are the same (entries for a given constellation only grow, never mutate in place).

```ts
export const ConstellationGroup = React.memo(
  function ConstellationGroup(props) { ... },
  (prev, next) =>
    prev.constellationId === next.constellationId &&
    prev.entries.length === next.entries.length &&
    prev.seed === next.seed &&
    prev.startYear === next.startYear,
);
```

**Components changed:** `constellation-group.tsx`.

### Fix 3 — Lazy initial load (last 3 months only)

In `galaxy.tsx`, replace the full-history initial fetch trigger:

```ts
// Before
handleVisibleMonthsChange(allSummaryMonths.current);

// After
handleVisibleMonthsChange(allSummaryMonths.current.slice(-3));
```

The skeleton entries from the summary API are already displayed for all months, so the galaxy appears complete immediately. Real data for older months loads on demand as the user pans — the existing `onVisibleMonthsChange` mechanism handles this correctly.

**Components changed:** `galaxy.tsx`.

## Files Touched

| File | Changes |
|---|---|
| `src/app/(tabs)/galaxy.tsx` | `useFocusEffect`, accumulator pattern, lazy init load |
| `src/components/galaxy-view.tsx` | `active` prop, memoize `visibleGroups` |
| `src/components/starfield.tsx` | `active` prop on `Starfield` + `StarGroup` |
| `src/components/constellation-group.tsx` | `active` prop, `React.memo` |

## Non-Goals

- Canvas/Skia rewrite (deferred — revisit if issues persist above 500 constellations).
- Virtualization of off-screen constellations beyond the existing viewport culling.
- Offline caching of fetched month data.
