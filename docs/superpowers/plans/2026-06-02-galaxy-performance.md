# Galaxy Performance Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate post-navigation jank and reduce load-time re-renders in the galaxy screen for users with ~146+ constellations.

**Architecture:** Four independent fixes applied bottom-up: leaf components first (`starfield`, `constellation-group`), then the view (`galaxy-view`), then the screen (`galaxy`). Each task is self-contained and can be committed separately.

**Tech Stack:** React Native, Expo Router, react-native-reanimated (`cancelAnimation`, `useSharedValue`, `withRepeat`), React (`useMemo`, `React.memo`, `useCallback`).

---

## File Map

| File | What changes |
|---|---|
| `src/components/starfield.tsx` | Add `active` prop to `Starfield` and `StarGroup`; cancel/restart `withRepeat` on blur |
| `src/components/constellation-group.tsx` | Add `active` prop; cancel/restart `dotPulse`; wrap with `React.memo` |
| `src/components/galaxy-view.tsx` | Add `active` prop passthrough; memoize `visibleGroups` |
| `src/app/(tabs)/galaxy.tsx` | `useFocusEffect`; accumulator + batch flush; lazy init load (`slice(-3)`) |

---

## Task 1: Pause starfield animations on tab blur

**Files:**
- Modify: `src/components/starfield.tsx`

- [ ] **Step 1: Add `cancelAnimation` to imports**

In `src/components/starfield.tsx`, update the reanimated import line:

```tsx
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
```

- [ ] **Step 2: Add `active` prop to `StarGroup` and react to it**

Replace the `StarGroup` function signature and its `useEffect`:

```tsx
function StarGroup({ stars, active }: { stars: StarData[]; active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      return;
    }
    const avgDelay = stars.reduce((s, st) => s + st.delay, 0) / stars.length;
    const avgDuration = stars.reduce((s, st) => s + st.duration, 0) / stars.length;
    progress.value = withDelay(
      avgDelay,
      withRepeat(withTiming(1, { duration: avgDuration, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [active, progress]);
  // rest of component unchanged
```

- [ ] **Step 3: Add `active` prop to `StarfieldProps` and pass it down**

```tsx
type StarfieldProps = {
  count?: number;
  active?: boolean;
};

export function Starfield({ count = 60, active = true }: StarfieldProps) {
  const stars = useMemo(() => generateStars(count), [count]);

  const groups = useMemo(() => {
    const result: StarData[][] = [];
    for (let i = 0; i < stars.length; i += GROUP_SIZE) {
      result.push(stars.slice(i, i + GROUP_SIZE));
    }
    return result;
  }, [stars]);

  return (
    <View style={styles.container} pointerEvents="none">
      {groups.map((group, i) => (
        <StarGroup key={i} stars={group} active={active} />
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/starfield.tsx
git commit -m "perf: pause starfield animations when galaxy tab loses focus"
```

---

## Task 2: Pause dotPulse and add React.memo to ConstellationGroup

**Files:**
- Modify: `src/components/constellation-group.tsx`

- [ ] **Step 1: Add `cancelAnimation` and `React` to imports**

```tsx
import React, { useEffect, useRef } from 'react';
// ...
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
```

- [ ] **Step 2: Add `active` to `Props` type**

```tsx
type Props = {
  seed: number;
  constellationId: string;
  entries: Entry[];
  startYear: number;
  view: GalaxyView;
  scale: SharedValue<number>;
  centerOverride?: { angle: number; radius: number };
  onStarPress?: (date: string) => void;
  active?: boolean;
};
```

- [ ] **Step 3: Destructure `active` and update the `dotPulse` useEffect**

Inside the function body, destructure `active = true` and replace the `dotPulse` `useEffect`:

```tsx
export const ConstellationGroup = React.memo(
  function ConstellationGroup({
    seed,
    constellationId,
    entries,
    startYear,
    view,
    scale,
    centerOverride,
    onStarPress,
    active = true,
  }: Props) {
    // ... existing derived values unchanged ...

    const dotPulse = useSharedValue(1);
    useEffect(() => {
      if (!active) {
        cancelAnimation(dotPulse);
        return;
      }
      dotPulse.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1100 }),
          withTiming(1, { duration: 1100 }),
        ),
        -1,
        false,
      );
    }, [active, dotPulse]);

    // rest of component JSX unchanged
  },
  (prev, next) =>
    prev.constellationId === next.constellationId &&
    prev.entries.length === next.entries.length &&
    prev.seed === next.seed &&
    prev.startYear === next.startYear,
);
```

Note: the `React.memo` wrapper replaces the plain `export function ConstellationGroup`. The closing `}` of the inner function is followed by `, (prev, next) => ...` as the comparator, then the outer `)` closes `React.memo(`.

- [ ] **Step 4: Commit**

```bash
git add src/components/constellation-group.tsx
git commit -m "perf: pause dotPulse animation on blur, memoize ConstellationGroup"
```

---

## Task 3: Memoize visibleGroups and pass active through GalaxyView

**Files:**
- Modify: `src/components/galaxy-view.tsx`

- [ ] **Step 1: Add `active` to `Props` type**

```tsx
type Props = {
  seed: number;
  groups: Map<string, Entry[]>;
  startYear: number;
  onVisibleMonthsChange?: (months: string[]) => void;
  active?: boolean;
};
```

- [ ] **Step 2: Destructure `active` in the component**

```tsx
export function GalaxyView({ seed, groups, startYear, onVisibleMonthsChange, active = true }: Props) {
```

- [ ] **Step 3: Replace the inline `visibleGroups` filter with a memoized version**

Find this block (currently not wrapped in useMemo):
```tsx
  // Only render constellations within the visible viewport (+margin)
  const visibleGroups = [...groups.entries()].filter(([cId]) => {
    const pos = positions.get(cId);
    if (!pos) return false;
    return isVisible(pos.cx, pos.cy, cull, width, height);
  });
```

Replace with:
```tsx
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

- [ ] **Step 4: Pass `active` to each `ConstellationGroup`**

In the JSX, find the `ConstellationGroup` usage and add the prop:

```tsx
{visibleGroups.map(([cId, entries]) => (
  <ConstellationGroup
    key={cId}
    seed={seed}
    constellationId={cId}
    entries={entries}
    startYear={startYear}
    view={view}
    scale={scale}
    centerOverride={positions.get(cId)}
    active={active}
  />
))}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/galaxy-view.tsx
git commit -m "perf: memoize visibleGroups, thread active prop to ConstellationGroup"
```

---

## Task 4: Wire focus tracking, batch updates, and lazy init load in galaxy.tsx

**Files:**
- Modify: `src/app/(tabs)/galaxy.tsx`

- [ ] **Step 1: Add `useFocusEffect` import and `focused` state**

Update the imports at the top of `galaxy.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';

import { GalaxyView } from '@/components/galaxy-view';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { getStoredSeed } from '@/lib/api';
import { fetchEntriesByMonth, fetchMonthSummary, type Entry } from '@/lib/entries';
import { constellationIdForEntry } from '@/lib/galaxyPositioning';
```

Then inside `GalaxyScreen`, after the existing `useRef` declarations, add:

```tsx
const [focused, setFocused] = useState(true);

useFocusEffect(
  useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []),
);
```

- [ ] **Step 2: Add accumulator refs**

After the existing refs, add:

```tsx
const pendingUpdates = useRef(new Map<string, Entry[]>());
const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 3: Add `flushPendingUpdates` callback**

After the accumulator refs, add:

```tsx
const flushPendingUpdates = useCallback(() => {
  const snapshot = new Map(pendingUpdates.current);
  pendingUpdates.current.clear();
  batchTimer.current = null;

  setGroups((prev) => {
    const next = new Map(prev);
    for (const [cId, newEntries] of snapshot) {
      const existing = (next.get(cId) ?? []).filter((e) => e.entryIndex >= 0);
      const merged = [...existing, ...newEntries];
      const deduped = [
        ...new Map(merged.map((e) => [e.entryIndex, e])).values(),
      ].sort((a, b) => a.entryIndex - b.entryIndex);
      next.set(cId, deduped);
    }
    return next;
  });
}, []);
```

- [ ] **Step 4: Replace the per-fetch `setGroups` call with accumulator logic**

Inside `handleVisibleMonthsChange`, find the `.then()` block of `fetchEntriesByMonth`. Replace the entire `setGroups(...)` call inside it with the accumulator pattern:

Before:
```tsx
fetchEntriesByMonth(month)
  .then((entries) => {
    const incoming = groupByConstellation(entries);
    setGroups((prev) => {
      const next = new Map(prev);
      for (const [cId, newEntries] of incoming) {
        const existing = (next.get(cId) ?? []).filter((e) => e.entryIndex >= 0);
        const merged = [...existing, ...newEntries];
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
```

After:
```tsx
fetchEntriesByMonth(month)
  .then((entries) => {
    const incoming = groupByConstellation(entries);
    for (const [cId, newEntries] of incoming) {
      const existing = pendingUpdates.current.get(cId) ?? [];
      pendingUpdates.current.set(cId, [...existing, ...newEntries]);
    }
    if (!batchTimer.current) {
      batchTimer.current = setTimeout(flushPendingUpdates, 0);
    }
    loadedMonths.current.add(month);
    pendingMonths.current.delete(month);
  })
```

- [ ] **Step 5: Change initial load to last 3 months only**

Find the `useEffect` that fires the initial load:

```tsx
  useEffect(() => {
    if (groups.size === 0 || initialLoadFired.current) return;
    initialLoadFired.current = true;
    handleVisibleMonthsChange(allSummaryMonths.current);
  }, [groups.size, handleVisibleMonthsChange]);
```

Change to:

```tsx
  useEffect(() => {
    if (groups.size === 0 || initialLoadFired.current) return;
    initialLoadFired.current = true;
    handleVisibleMonthsChange(allSummaryMonths.current.slice(-3));
  }, [groups.size, handleVisibleMonthsChange]);
```

- [ ] **Step 6: Pass `active` and `focused` to `Starfield` and `GalaxyView`**

In the return JSX:

```tsx
return (
  <View style={styles.container}>
    <StatusBar style="light" />
    <SpaceBackground />
    <Starfield active={focused} />
    <GalaxyView
      seed={seed}
      groups={groups}
      startYear={startYear}
      onVisibleMonthsChange={handleVisibleMonthsChange}
      active={focused}
    />
  </View>
);
```

- [ ] **Step 7: Commit**

```bash
git add src/app/(tabs)/galaxy.tsx
git commit -m "perf: focus-aware animations, batch state updates, lazy month load"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start the app**

```bash
npx expo start
```

Open on a physical device or emulator with the galaxy screen populated (~100+ constellations).

- [ ] **Step 2: Verify post-navigation smoothness**

Navigate to the galaxy tab. Let it load. Then switch to another tab (e.g., journal). Scroll or interact on that tab — it should feel immediately smooth with no dropped frames. Before this fix, it would stutter.

- [ ] **Step 3: Verify galaxy animations resume**

Switch back to the galaxy tab. The starfield and dotPulse dots on constellations should resume pulsing within ~1s.

- [ ] **Step 4: Verify load speed**

Hard-reload the app. The galaxy screen should show the skeleton immediately, then load real data for the most recent 3 months first. Older months fill in as you pan toward them. The initial render should be noticeably faster than before.

- [ ] **Step 5: Verify culling still works**

Pan to a region with no constellations. The FPS should stay high. Pan back — constellations render as they enter the viewport.
