# Galaxy Lazy Loading — Design Spec

**Date:** 2026-06-02  
**Status:** Approved

## Problem

The galaxy screen fetches all 522 entries (across ~11 pages, 50 per page) sequentially before calling `setGroups()`. Nothing is rendered until all requests complete. The fix: render a skeleton galaxy immediately on mount, then load entries per month as the user navigates.

## Architecture

Three phases replace the current sequential for-loop:

**Phase 1 — Mount (instant skeleton)**  
`GET /entries/months` returns a lightweight `MonthSummary[]`. The app builds a `Map<constellationId, Entry[]>` with empty arrays for every known month and calls `setGroups()` immediately. The galaxy appears with ghost stars for all months.

**Phase 2 — Viewport tracking (debounced)**  
`GalaxyView` detects which constellations are inside a prefetch buffer (viewport + `PREFETCH_MARGIN = 800px`) after pan/zoom settles (150ms debounce). It calls `onVisibleMonthsChange(months: string[])` via `runOnJS`.

**Phase 3 — Lazy fetch (per visible month)**  
`galaxy.tsx` filters out already-loaded and in-flight months, fires `GET /entries/by-month/{month}` requests in parallel for new ones, and patches `groups` as each response arrives. Ghost stars fill in with real entries.

On initial mount, `handleVisibleMonthsChange` is called once manually so the starting viewport loads without requiring user interaction.

## Data Layer

**New type in `types.ts`:**
```ts
type MonthSummary = {
  month: string;  // "YYYY-MM"
  count: number;
};
```

**New functions in `entries.ts`:**
```ts
fetchMonthSummary(): Promise<MonthSummary[]>
// GET /entries/months

fetchEntriesByMonth(month: string): Promise<Entry[]>
// GET /entries/by-month/{month} → toEntries()
```

**Helpers:**
- `monthToConstellationId(month: string): string` — converts `"YYYY-MM"` to the key format used by `assignPositions()`. Exact format confirmed at implementation time by reading the existing grouping logic.
- `constellationIdToMonth(id: string): string` — inverse, used when triggering per-month fetches.

## State in `galaxy.tsx`

```ts
groups: Map<string, Entry[]>   // existing — now allows empty arrays (skeleton)
loadedMonths: Set<string>       // constellationIds with entries fetched
pendingMonths: Set<string>      // constellationIds with fetch in flight
```

**Bootstrap:**
```ts
const summary = await fetchMonthSummary();
const skeleton = new Map<string, Entry[]>();
for (const { month } of summary) {
  skeleton.set(monthToConstellationId(month), []);
}
setGroups(skeleton);
```

**Lazy fetch handler:**
```ts
const handleVisibleMonthsChange = useCallback((months: string[]) => {
  const toFetch = months.filter(
    m => !loadedMonths.has(m) && !pendingMonths.has(m)
  );
  if (toFetch.length === 0) return;

  setPendingMonths(prev => new Set([...prev, ...toFetch]));

  toFetch.forEach(async (constellationId) => {
    const month = constellationIdToMonth(constellationId);
    const entries = await fetchEntriesByMonth(month);

    setGroups(prev => new Map(prev).set(constellationId, entries));
    setLoadedMonths(prev => new Set([...prev, constellationId]));
    setPendingMonths(prev => { const s = new Set(prev); s.delete(constellationId); return s; });
  });
}, [loadedMonths, pendingMonths]);
```

**Error handling:** if a fetch fails, the month stays in `pendingMonths`. A 5-second timeout removes it automatically, allowing retry on the next viewport change.

## GalaxyView Changes

**New prop:**
```ts
onVisibleMonthsChange: (months: string[]) => void
```

**Two margin constants (separate concerns):**
- `CULL_MARGIN = 300` — existing, controls render culling
- `PREFETCH_MARGIN = 800` — new, controls prefetch buffer (~1 screen)

**Detection function** (called debounced 150ms after pan/zoom stops):
```ts
function getMonthsInBuffer(positions, groups, tx, ty, s, w, h): string[] {
  return [...groups.keys()].filter(cId => {
    const pos = positions.get(cId);
    return pos && isVisible(pos.cx, pos.cy, { tx, ty, s }, w, h, PREFETCH_MARGIN);
  });
}
```

`isVisible()` already accepts a margin parameter — called with `PREFETCH_MARGIN` instead of `CULL_MARGIN`.

**Debounce:** `useRef` + `setTimeout`/`clearTimeout` in the pan/zoom handler. No new libraries.

**Reanimated:** callback fires from a worklet via existing `runOnJS`.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `MonthSummary` type |
| `src/lib/entries.ts` | Add `fetchMonthSummary`, `fetchEntriesByMonth` |
| `src/app/(tabs)/galaxy.tsx` | Replace fetch loop; add lazy load handler; add `loadedMonths`, `pendingMonths` state |
| `src/components/galaxy-view.tsx` | Add `onVisibleMonthsChange` prop; add debounced buffer detection |

**No changes to:** `constellation-group.tsx`, `galaxyPositioning.ts`, animations, culling render logic.

## Non-Goals

- Per-star culling (constellation-level culling already exists and is sufficient)
- Offline caching
- Real-time updates / server-sent events
- Changing page size or pagination strategy for existing endpoints
