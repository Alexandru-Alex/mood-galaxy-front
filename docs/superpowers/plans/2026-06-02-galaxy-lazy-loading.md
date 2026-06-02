# Galaxy Lazy Loading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sequential all-pages fetch in `galaxy.tsx` with an instant skeleton galaxy that fills in per-month as the user navigates.

**Architecture:** Fetch `GET /entries/months` on mount to build a skeleton `Map<constellationId, Entry[]>` (placeholder entries so positions resolve immediately); each pan/zoom settles triggers a debounced viewport scan that fetches `/entries/by-month/{month}` for any month entering the prefetch buffer, merging real entries into `groups` in place.

**Tech Stack:** React Native (Expo), Reanimated 3, react-native-gesture-handler, TypeScript

---

## Prerequisite: Update the backend `/entries/months` endpoint

The endpoint must return `constellationIds` alongside each month (the frontend cannot derive global `cN` IDs from a count alone).

Required shape:
```json
[
  { "month": "2024-01", "constellationIds": ["c0", "c1"] },
  { "month": "2024-02", "constellationIds": ["c1", "c2", "c3"] }
]
```

`constellationIds` are the same `c${Math.floor((entryIndex-1)/7)}` identifiers the frontend already uses. A constellation appears in the month of its first entry. **Do not proceed with Task 1 until this endpoint is updated.**

---

## File Map

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `MonthSummary` type |
| `src/lib/entries.ts` | Add `fetchMonthSummary`, `fetchEntriesByMonth` |
| `src/lib/galaxyBuffer.ts` | **New** — pure `getMonthsInBuffer` helper (extracted for testability) |
| `src/app/(tabs)/galaxy.tsx` | Replace for-loop; add skeleton + lazy-fetch handler |
| `src/components/galaxy-view.tsx` | Add `margin` param to `isVisible`; add `onVisibleMonthsChange` prop + debounced detection |
| `src/__tests__/entries.test.ts` | Tests for the two new fetch functions |
| `src/__tests__/galaxyBuffer.test.ts` | Tests for `getMonthsInBuffer` |

---

## Task 1 — Add `MonthSummary` type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add the type**

Open `src/lib/types.ts` and append after the last type:

```ts
/** Response item from GET /entries/months. */
export type MonthSummary = {
  month: string;           // "YYYY-MM"
  constellationIds: string[]; // e.g. ["c0", "c1"]
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add MonthSummary type"
```

---

## Task 2 — Data layer: `fetchMonthSummary` + `fetchEntriesByMonth`

**Files:**
- Modify: `src/lib/entries.ts`
- Create: `src/__tests__/entries.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/entries.test.ts`:

```ts
import { fetchMonthSummary, fetchEntriesByMonth } from '@/lib/entries';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn() } }));
const mockGet = api.get as jest.MockedFunction<typeof api.get>;

describe('fetchMonthSummary', () => {
  it('returns the array from GET /entries/months', async () => {
    const payload = [{ month: '2024-01', constellationIds: ['c0'] }];
    mockGet.mockResolvedValueOnce(payload);
    const result = await fetchMonthSummary();
    expect(mockGet).toHaveBeenCalledWith('/entries/months');
    expect(result).toEqual(payload);
  });

  it('returns empty array on unexpected shape', async () => {
    mockGet.mockResolvedValueOnce(null);
    const result = await fetchMonthSummary();
    expect(result).toEqual([]);
  });
});

describe('fetchEntriesByMonth', () => {
  it('converts BackendEntry[] to Entry[]', async () => {
    mockGet.mockResolvedValueOnce([
      { entryDate: '2024-01-03', mood: 'HAPPY', entryIndex: 1 },
      { entryDate: '2024-01-15', mood: 'SAD', entryIndex: 2 },
    ]);
    const result = await fetchEntriesByMonth('2024-01');
    expect(mockGet).toHaveBeenCalledWith('/entries/by-month/2024-01');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ entryIndex: 1, date: '2024-01-03', mood: 'HAPPY' });
  });

  it('returns empty array on unexpected shape', async () => {
    mockGet.mockResolvedValueOnce(null);
    const result = await fetchEntriesByMonth('2024-01');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx jest src/__tests__/entries.test.ts --no-coverage
```

Expected: `FAIL` — `fetchMonthSummary` and `fetchEntriesByMonth` are not yet exported.

- [ ] **Step 3: Add the functions to `entries.ts`**

Add these two exports at the bottom of `src/lib/entries.ts` (keep everything existing):

```ts
export async function fetchMonthSummary(): Promise<import('./types').MonthSummary[]> {
  const data = await api.get<import('./types').MonthSummary[]>('/entries/months');
  return Array.isArray(data) ? data : [];
}

export async function fetchEntriesByMonth(month: string): Promise<Entry[]> {
  const data = await api.get<BackendEntry[]>(`/entries/by-month/${month}`);
  if (!Array.isArray(data)) return [];
  return toEntries(data);
}
```

- [ ] **Step 4: Run to confirm they pass**

```bash
npx jest src/__tests__/entries.test.ts --no-coverage
```

Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/entries.ts src/__tests__/entries.test.ts
git commit -m "feat: add fetchMonthSummary and fetchEntriesByMonth"
```

---

## Task 3 — Extract `getMonthsInBuffer` into `galaxyBuffer.ts`

**Files:**
- Create: `src/lib/galaxyBuffer.ts`
- Create: `src/__tests__/galaxyBuffer.test.ts`

This pure helper is extracted so it can be tested and imported by both `galaxy-view.tsx` and its tests.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/galaxyBuffer.test.ts`:

```ts
import { getMonthsInBuffer } from '@/lib/galaxyBuffer';
import type { Entry } from '@/lib/entries';

type GalaxyPos = { angle: number; radius: number; cx: number; cy: number };

const W = 390;
const H = 844;

function makePositions(items: Array<{ cId: string; cx: number; cy: number }>): Map<string, GalaxyPos> {
  return new Map(items.map(({ cId, cx, cy }) => [cId, { angle: 0, radius: 0, cx, cy }]));
}

function makeGroups(items: Array<{ cId: string; date: string }>): Map<string, Entry[]> {
  return new Map(items.map(({ cId, date }) => [cId, [{ entryIndex: -1, date, mood: 'NEUTRAL' }]]));
}

describe('getMonthsInBuffer', () => {
  it('returns months for constellations inside the prefetch buffer', () => {
    // Constellation at cx=0,cy=0 → screen center → always visible
    const positions = makePositions([{ cId: 'c0', cx: 0, cy: 0 }]);
    const groups = makeGroups([{ cId: 'c0', date: '2024-01-01' }]);
    const months = getMonthsInBuffer(positions, groups, 0, 0, 1, W, H);
    expect(months).toContain('2024-01');
  });

  it('excludes constellations far outside the buffer', () => {
    // Far off-screen: cx=10000, no translation, scale=1
    const positions = makePositions([{ cId: 'c0', cx: 10000, cy: 0 }]);
    const groups = makeGroups([{ cId: 'c0', date: '2024-01-01' }]);
    const months = getMonthsInBuffer(positions, groups, 0, 0, 1, W, H);
    expect(months).not.toContain('2024-01');
  });

  it('deduplicates months when multiple constellations share a month', () => {
    const positions = makePositions([
      { cId: 'c0', cx: 0, cy: 0 },
      { cId: 'c1', cx: 10, cy: 10 },
    ]);
    const groups = makeGroups([
      { cId: 'c0', date: '2024-01-01' },
      { cId: 'c1', date: '2024-01-15' },
    ]);
    const months = getMonthsInBuffer(positions, groups, 0, 0, 1, W, H);
    expect(months.filter((m) => m === '2024-01')).toHaveLength(1);
  });

  it('skips constellations with no entries', () => {
    const positions = makePositions([{ cId: 'c0', cx: 0, cy: 0 }]);
    const groups: Map<string, Entry[]> = new Map([['c0', []]]);
    const months = getMonthsInBuffer(positions, groups, 0, 0, 1, W, H);
    expect(months).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx jest src/__tests__/galaxyBuffer.test.ts --no-coverage
```

Expected: `FAIL` — module not found.

- [ ] **Step 3: Create `src/lib/galaxyBuffer.ts`**

```ts
import type { Entry } from '@/lib/entries';

const PREFETCH_MARGIN = 800;

type CullState = { tx: number; ty: number; s: number };
type GalaxyPos = { angle: number; radius: number; cx: number; cy: number };

function isInBuffer(
  cx: number,
  cy: number,
  { tx, ty, s }: CullState,
  width: number,
  height: number,
): boolean {
  const screenX = cx * s + width / 2 + tx;
  const screenY = cy * s + height / 2 + ty;
  return (
    screenX > -PREFETCH_MARGIN &&
    screenX < width + PREFETCH_MARGIN &&
    screenY > -PREFETCH_MARGIN &&
    screenY < height + PREFETCH_MARGIN
  );
}

export function getMonthsInBuffer(
  positions: Map<string, GalaxyPos>,
  groups: Map<string, Entry[]>,
  tx: number,
  ty: number,
  s: number,
  width: number,
  height: number,
): string[] {
  const seen = new Set<string>();
  for (const [cId, pos] of positions) {
    if (!isInBuffer(pos.cx, pos.cy, { tx, ty, s }, width, height)) continue;
    const entries = groups.get(cId);
    if (!entries?.[0]) continue;
    seen.add(entries[0].date.slice(0, 7));
  }
  return [...seen];
}
```

- [ ] **Step 4: Run to confirm they pass**

```bash
npx jest src/__tests__/galaxyBuffer.test.ts --no-coverage
```

Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/galaxyBuffer.ts src/__tests__/galaxyBuffer.test.ts
git commit -m "feat: add getMonthsInBuffer helper"
```

---

## Task 4 — Update `galaxy-view.tsx`: margin param + viewport callback

**Files:**
- Modify: `src/components/galaxy-view.tsx`

- [ ] **Step 1: Add margin parameter to `isVisible`**

In `src/components/galaxy-view.tsx`, replace the `isVisible` function (lines 121–137) with:

```ts
function isVisible(
  cx: number,
  cy: number,
  { tx, ty, s }: CullState,
  width: number,
  height: number,
  margin = CULL_MARGIN,
): boolean {
  const screenX = cx * s + width / 2 + tx;
  const screenY = cy * s + height / 2 + ty;
  return (
    screenX > -margin &&
    screenX < width + margin &&
    screenY > -margin &&
    screenY < height + margin
  );
}
```

- [ ] **Step 2: Add `onVisibleMonthsChange` to the `Props` type**

Replace the existing `Props` type (lines 139–143):

```ts
type Props = {
  seed: number;
  groups: Map<string, Entry[]>;
  startYear: number;
  onVisibleMonthsChange?: (months: string[]) => void;
};
```

- [ ] **Step 3: Import `getMonthsInBuffer` and add refs + debounce**

Add this import at the top of the file, alongside other imports:

```ts
import { getMonthsInBuffer } from '@/lib/galaxyBuffer';
```

Inside `GalaxyView`, after the existing `hasCentered` ref declaration (line 161), add:

```ts
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const positionsRef = useRef(positions);
const groupsRef = useRef(groups);
```

After the `positions` useMemo and `monthGroups` useMemo, add two effects to keep the refs current:

```ts
useEffect(() => { positionsRef.current = positions; }, [positions]);
useEffect(() => { groupsRef.current = groups; }, [groups]);
```

- [ ] **Step 4: Update `updateCull` to fire the debounced callback**

Replace the existing `updateCull` function (line 207):

```ts
const updateCull = (tx: number, ty: number, s: number) => {
  setCull({ tx, ty, s });
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    if (!onVisibleMonthsChange) return;
    const months = getMonthsInBuffer(positionsRef.current, groupsRef.current, tx, ty, s, width, height);
    onVisibleMonthsChange(months);
  }, 150);
};
```

- [ ] **Step 5: Update the `GalaxyView` function signature** to destructure the new prop:

```ts
export function GalaxyView({ seed, groups, startYear, onVisibleMonthsChange }: Props) {
```

- [ ] **Step 6: Commit**

```bash
git add src/components/galaxy-view.tsx
git commit -m "feat: add viewport buffer callback to GalaxyView"
```

---

## Task 5 — Update `galaxy.tsx`: skeleton bootstrap + lazy fetch

**Files:**
- Modify: `src/app/(tabs)/galaxy.tsx`

- [ ] **Step 1: Replace imports at the top of `galaxy.tsx`**

Replace the existing import block with:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { GalaxyView } from '@/components/galaxy-view';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { getStoredSeed } from '@/lib/api';
import { fetchEntriesByMonth, fetchMonthSummary, toEntries, type Entry } from '@/lib/entries';
import { constellationIdForEntry } from '@/lib/galaxyPositioning';
```

- [ ] **Step 2: Replace the `groupByConstellation` helper**

The helper needs to merge incoming entries without overwriting entries from other months that share the same constellationId. Replace the existing `groupByConstellation` function with:

```ts
function groupByConstellation(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const cId = constellationIdForEntry(e.entryIndex);
    if (!map.has(cId)) map.set(cId, []);
    map.get(cId)!.push(e);
  }
  return map;
}
```

- [ ] **Step 3: Replace `GalaxyScreen` state and add new state**

Replace the existing state declarations (lines 27–29) with:

```ts
const [seed, setSeed] = useState(FALLBACK_SEED);
const [groups, setGroups] = useState<Map<string, Entry[]>>(new Map());
const [startYear, setStartYear] = useState(START_YEAR);
const loadedMonths = useRef(new Set<string>());
const pendingMonths = useRef(new Set<string>());
const constellationToMonth = useRef(new Map<string, string>());
```

Using `useRef` for `loadedMonths`, `pendingMonths`, and `constellationToMonth` avoids stale-closure issues and prevents unnecessary re-renders on mutation.

- [ ] **Step 4: Replace the `useEffect` data-fetch block**

Replace lines 31–48 (the existing `useEffect`) with:

```ts
useEffect(() => {
  getStoredSeed()
    .then((s) => { if (s !== null) setSeed(s); })
    .catch(console.error);

  (async () => {
    const summary = await fetchMonthSummary();
    const skeleton = new Map<string, Entry[]>();
    for (const { month, constellationIds } of summary) {
      const skeletonDate = `${month}-01`;
      for (const cId of constellationIds) {
        // Placeholder entry: entryIndex -1 fills no slot (all ghost stars),
        // but gives assignPositions() a date to compute the ring position.
        skeleton.set(cId, [{ entryIndex: -1, date: skeletonDate, mood: 'NEUTRAL' as const }]);
        constellationToMonth.current.set(cId, month);
      }
    }
    if (summary.length > 0) {
      // Derive startYear from earliest month in summary (summary is sorted ascending)
      setStartYear(new Date(`${summary[0].month}-01`).getUTCFullYear());
    }
    setGroups(skeleton);
  })().catch(console.error);
}, []);
```

- [ ] **Step 5: Add the `handleVisibleMonthsChange` callback**

Add this after the `useEffect`, before the `return` statement:

```ts
const handleVisibleMonthsChange = useCallback((months: string[]) => {
  const toFetch = months.filter(
    (m) => !loadedMonths.current.has(m) && !pendingMonths.current.has(m),
  );
  if (toFetch.length === 0) return;

  for (const m of toFetch) pendingMonths.current.add(m);

  for (const month of toFetch) {
    fetchEntriesByMonth(month)
      .then((entries) => {
        const incoming = groupByConstellation(entries);
        setGroups((prev) => {
          const next = new Map(prev);
          for (const [cId, newEntries] of incoming) {
            // Remove placeholders, merge with any real entries already in this constellation
            const existing = (next.get(cId) ?? []).filter((e) => e.entryIndex >= 0);
            const merged = [...existing, ...newEntries];
            // Deduplicate by entryIndex (cross-month constellations can arrive twice)
            const deduped = [
              ...new Map(merged.map((e) => [e.entryIndex, e])).values(),
            ].sort((a, b) => a.entryIndex - b.entryIndex);
            next.set(cId, deduped);
          }
          return next;
        });
        loadedMonths.current.add(month);
        pendingMonths.current.delete(month);
      })
      .catch(() => {
        // Allow retry after 5 s if the fetch fails
        setTimeout(() => pendingMonths.current.delete(month), 5000);
      });
  }
}, []);
```

- [ ] **Step 6: Wire `onVisibleMonthsChange` into `GalaxyView`**

In the `return` block, update the `<GalaxyView>` JSX:

```tsx
<GalaxyView
  seed={seed}
  groups={groups}
  startYear={startYear}
  onVisibleMonthsChange={handleVisibleMonthsChange}
/>
```

- [ ] **Step 7: Trigger initial viewport load**

The `GalaxyView` fires `onVisibleMonthsChange` only after a pan/zoom. We need to load the initial viewport immediately after the skeleton renders. Add a `useRef` guard and a second `useEffect` after the first:

Add before the return statement (alongside the other refs):
```ts
const initialLoadFired = useRef(false);
```

Then add the effect:
```ts
useEffect(() => {
  if (groups.size === 0 || initialLoadFired.current) return;
  initialLoadFired.current = true;
  const allMonths = [...new Set(constellationToMonth.current.values())];
  handleVisibleMonthsChange(allMonths);
}, [groups.size, handleVisibleMonthsChange]);
```

The `initialLoadFired` ref ensures this fires exactly once when the skeleton transitions from empty to populated, regardless of future `groups.size` changes.

- [ ] **Step 8: Commit**

```bash
git add src/app/(tabs)/galaxy.tsx
git commit -m "feat: skeleton bootstrap + viewport-driven lazy loading for galaxy"
```

---

## Task 6 — Smoke test

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 2: Start the dev server and verify in a device/simulator**

```bash
npx expo start
```

Open the Galaxy tab and confirm:
1. Galaxy renders immediately with ghost stars (skeleton visible before any pan/zoom)
2. Stars fill in within ~1 second of mount (initial viewport load fires)
3. Panning to a new area causes stars to appear in that region without a full reload
4. No duplicate fetch for the same month (check network tab / logs)
5. The recenter button still works
6. Zoom in/out still culls correctly

- [ ] **Step 3: Commit (if any polish changes were made)**

```bash
git add -p
git commit -m "fix: polish galaxy lazy loading smoke test findings"
```
