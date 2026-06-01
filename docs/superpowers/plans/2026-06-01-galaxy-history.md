# Galaxy History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all past constellations in `/galaxy` as a free pan+zoom galaxy, while `/dashboard` stays unchanged.

**Architecture:** Extract the single-constellation rendering logic from `ConstellationCanvas` into a new `ConstellationGroup` component that accepts a pre-computed `view`. `GalaxyView` wraps N `ConstellationGroup`s inside a pan+zoom gesture container (CSS transform on an `Animated.View`). `galaxy.tsx` fetches `GET /entries`, groups by `constellationId`, and mounts `GalaxyView`.

**Tech Stack:** react-native-gesture-handler v2 (`Gesture.Pan`, `Gesture.Pinch`, `GestureDetector`), react-native-reanimated 4 (`useSharedValue`, `useAnimatedStyle`), react-native-svg (existing), existing `galaxyPositioning.ts` (unchanged).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/entries.ts` | CREATE | Shared `toEntries` helper + `Entry` type |
| `src/components/constellation-group.tsx` | CREATE | Renders one constellation: stars, lines, aura |
| `src/components/constellation-canvas.tsx` | MODIFY | Thin wrapper: computes fixed view, delegates to `ConstellationGroup` |
| `src/components/galaxy-view.tsx` | CREATE | Pan+zoom gesture container, renders N `ConstellationGroup`s |
| `src/app/galaxy.tsx` | MODIFY | Fetches `GET /entries`, groups entries, mounts `GalaxyView` |
| `src/app/dashboard.tsx` | MODIFY | Import `toEntries` + `Entry` from `src/lib/entries.ts` |
| `src/app/_layout.tsx` | MODIFY | Wrap root with `GestureHandlerRootView` (required for `GestureDetector`) |

---

## Task 1 — Extract shared `Entry` type and `toEntries` helper

**Files:**
- Create: `src/lib/entries.ts`
- Modify: `src/app/dashboard.tsx`
- Modify: `src/components/constellation-canvas.tsx`

- [ ] **Step 1: Create `src/lib/entries.ts`**

```ts
import type { Mood } from '@/constants/theme';
import type { BackendEntry } from '@/lib/types';

export type Entry = { entryIndex: number; date: string; mood: Mood };

export function toEntries(data: BackendEntry[]): Entry[] {
  return data.map((item, i) => ({
    entryIndex: item.entryIndex ?? i,
    date: item.entryDate,
    mood: (item.mood as Mood) || 'NEUTRAL',
  }));
}
```

- [ ] **Step 2: Update `src/app/dashboard.tsx` — replace local `Entry` type and `toEntries` with imports**

Remove the local `toEntries` function and `Entry` type from `dashboard.tsx`. Add this import:

```ts
import { toEntries, type Entry } from '@/lib/entries';
```

Remove the import of `type Entry` from `@/components/constellation-canvas`.

- [ ] **Step 3: Update `src/components/constellation-canvas.tsx` — remove local `Entry` type, import from lib**

Replace the local `export type Entry = ...` line with:

```ts
export type { Entry } from '@/lib/entries';
```

And add the import at the top:

```ts
import type { Entry } from '@/lib/entries';
```

- [ ] **Step 4: Verify TypeScript compiles**

```
npx expo lint
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/entries.ts src/app/dashboard.tsx src/components/constellation-canvas.tsx
git commit -m "refactor: extract Entry type and toEntries to src/lib/entries"
```

---

## Task 2 — Create `ConstellationGroup`

**Files:**
- Create: `src/components/constellation-group.tsx`

This is the rendering logic extracted from `ConstellationCanvas`. The key difference: instead of computing `view` internally from `width`/`height`, it receives `view` as a prop.

- [ ] **Step 1: Create `src/components/constellation-group.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Polyline, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MoodColors, Palette, type Mood } from '@/constants/theme';
import {
  blendMoodColors,
  generateConstellationShape,
  getConstellationCenter,
  slotForEntry,
  starScreenPosition,
  type Point,
  type View as GalaxyView,
} from '@/lib/galaxyPositioning';
import type { Entry } from '@/lib/entries';

const SLOT_RADIUS = 120;
const HALO = 22;
const CORE = 7;
const AURA_RADIUS = SLOT_RADIUS * 1.4;

function FilledStar({ x, y, mood }: Point & { mood: Mood }) {
  const color = MoodColors[mood];
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }, style]}>
      <View style={[styles.halo, { backgroundColor: color }]} />
      <View style={[styles.core, { backgroundColor: color }]} />
    </Animated.View>
  );
}

function GhostStar({ x, y }: Point) {
  return (
    <View style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }]}>
      <View style={styles.ghost} />
    </View>
  );
}

function ConstellationAura({
  cx,
  cy,
  color,
  radius,
  canvasWidth,
  canvasHeight,
}: {
  cx: number;
  cy: number;
  color: string;
  radius: number;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const gradientId = useRef(`aura-${Math.random().toString(36).slice(2)}`).current;
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={canvasWidth} height={canvasHeight}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={radius} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

type Props = {
  seed: number;
  constellationId: string;
  entries: Entry[];
  startYear: number;
  view: GalaxyView;
  canvasWidth: number;
  canvasHeight: number;
};

export function ConstellationGroup({
  seed,
  constellationId,
  entries,
  startYear,
  view,
  canvasWidth,
  canvasHeight,
}: Props) {
  const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  const centerDate = sorted.length > 0 ? sorted[0].date : new Date().toISOString().slice(0, 10);

  const center = getConstellationCenter(centerDate, startYear);
  const isComplete = sorted.length >= 7;
  const auraCx = view.centerX + Math.cos(center.angle) * center.radius * view.zoom;
  const auraCy = view.centerY + Math.sin(center.angle) * center.radius * view.zoom;
  const auraColor = blendMoodColors(sorted, MoodColors);
  const shape = generateConstellationShape(seed, constellationId);
  const allPositions = shape.map((p) => starScreenPosition(center, p, view, SLOT_RADIUS));
  const filledSlots = new Set(sorted.map((e) => slotForEntry(e.entryIndex)));
  const slotMoodMap = new Map(sorted.map((e) => [slotForEntry(e.entryIndex), e.mood]));
  const filledPositions = allPositions.filter((_, i) => filledSlots.has(i));

  const ghostPoints = allPositions.map((p) => `${p.x},${p.y}`).join(' ');
  const solidPoints = filledPositions.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {isComplete && (
        <ConstellationAura
          cx={auraCx}
          cy={auraCy}
          color={auraColor}
          radius={AURA_RADIUS}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
      <Svg width={canvasWidth} height={canvasHeight} style={StyleSheet.absoluteFill}>
        <Polyline
          points={ghostPoints}
          fill="none"
          stroke={Palette.brightLavender}
          strokeWidth={1}
          strokeOpacity={0.3}
          strokeDasharray="4 6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {filledPositions.length >= 2 && (
          <Polyline
            points={solidPoints}
            fill="none"
            stroke={Palette.brightLavender}
            strokeWidth={1}
            strokeOpacity={0.85}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </Svg>
      {allPositions.map((p, i) =>
        filledSlots.has(i) ? null : <GhostStar key={i} x={p.x} y={p.y} />,
      )}
      {allPositions.map((p, i) =>
        filledSlots.has(i) ? (
          <FilledStar key={`f-${i}`} x={p.x} y={p.y} mood={slotMoodMap.get(i) ?? 'NEUTRAL'} />
        ) : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  starWrap: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    opacity: 0.25,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
  },
  ghost: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    borderWidth: 1,
    borderColor: Palette.brightLavender,
    opacity: 0.4,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npx expo lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/constellation-group.tsx
git commit -m "feat: add ConstellationGroup component"
```

---

## Task 3 — Refactor `ConstellationCanvas` into a thin wrapper

**Files:**
- Modify: `src/components/constellation-canvas.tsx`

`ConstellationCanvas` keeps its existing public API (same props as today) so `dashboard.tsx` needs zero changes.

- [ ] **Step 1: Replace `constellation-canvas.tsx` with the thin wrapper**

```tsx
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { constellationIdForEntry } from '@/lib/galaxyPositioning';
import type { Entry } from '@/lib/entries';
import { ConstellationGroup } from '@/components/constellation-group';

export type { Entry } from '@/lib/entries';

type Props = {
  seed: number;
  entries: Entry[];
  startYear: number;
  width: number;
  height: number;
};

export function ConstellationCanvas({ seed, entries, startYear, width, height }: Props) {
  const view = { centerX: width / 2, centerY: height / 2, zoom: 1 };
  const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  const cId = sorted.length > 0 ? constellationIdForEntry(sorted[0].entryIndex) : 'c0';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ConstellationGroup
        seed={seed}
        constellationId={cId}
        entries={sorted}
        startYear={startYear}
        view={view}
        canvasWidth={width}
        canvasHeight={height}
      />
    </View>
  );
}
```

- [ ] **Step 2: Verify the app compiles and dashboard still renders the constellation correctly**

```
npx expo start --web
```

Open `http://localhost:8081/dashboard` — constellation should look identical to before.

- [ ] **Step 3: Commit**

```bash
git add src/components/constellation-canvas.tsx
git commit -m "refactor: ConstellationCanvas becomes thin wrapper over ConstellationGroup"
```

---

## Task 4 — Add `GestureHandlerRootView` to root layout

**Files:**
- Modify: `src/app/_layout.tsx`

`GestureDetector` (used in `GalaxyView`) requires `GestureHandlerRootView` to wrap the whole app. Without it, pan+pinch gestures silently do nothing.

- [ ] **Step 1: Wrap the root layout with `GestureHandlerRootView`**

Add the import:

```ts
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

Wrap the return value of `RootLayout`:

```tsx
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <AudioProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGuard />
        <AnimatedSplashOverlay />
        <Stack initialRouteName="landing" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="landing" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="pending-verification" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="galaxy" />
          <Stack.Screen name="auth" />
        </Stack>
      </ThemeProvider>
    </AudioProvider>
  </GestureHandlerRootView>
);
```

- [ ] **Step 2: Verify dashboard still works (bottom sheet and all interactions)**

```
npx expo start --web
```

Open dashboard, tap "How are you feeling" — bottom sheet should open as before.

- [ ] **Step 3: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "fix: wrap root with GestureHandlerRootView for gesture support"
```

---

## Task 5 — Create `GalaxyView`

**Files:**
- Create: `src/components/galaxy-view.tsx`

Pan+zoom is implemented as a CSS `transform` on an `Animated.View` wrapping all `ConstellationGroup`s. This means all groups render at their natural positions (zoom=1, center at screen center) and the entire canvas is shifted/scaled together — no per-group position recalculation during gesture.

- [ ] **Step 1: Create `src/components/galaxy-view.tsx`**

```tsx
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { ConstellationGroup } from '@/components/constellation-group';
import type { Entry } from '@/lib/entries';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

type Props = {
  seed: number;
  groups: Map<string, Entry[]>;
  startYear: number;
};

export function GalaxyView({ seed, groups, startYear }: Props) {
  const { width, height } = useWindowDimensions();
  const view = { centerX: width / 2, centerY: height / 2, zoom: 1 };

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Saved values at gesture start — prevents jumps when starting a new gesture
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const pan = Gesture.Pan()
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, savedScale.value * e.scale));
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          {[...groups.entries()].map(([cId, entries]) => (
            <ConstellationGroup
              key={cId}
              seed={seed}
              constellationId={cId}
              entries={entries}
              startYear={startYear}
              view={view}
              canvasWidth={width}
              canvasHeight={height}
            />
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npx expo lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/galaxy-view.tsx
git commit -m "feat: add GalaxyView with pan+zoom gesture"
```

---

## Task 6 — Wire up `galaxy.tsx`

**Files:**
- Modify: `src/app/galaxy.tsx`

Fetch all entries from `GET /entries`, group by `constellationId`, pass to `GalaxyView`.

- [ ] **Step 1: Replace `src/app/galaxy.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { GalaxyView } from '@/components/galaxy-view';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { api, getStoredSeed } from '@/lib/api';
import { toEntries, type Entry } from '@/lib/entries';
import { constellationIdForEntry } from '@/lib/galaxyPositioning';
import type { BackendEntry } from '@/lib/types';

const FALLBACK_SEED = 42;
const START_YEAR = 2026;

function groupByConstellation(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const cId = constellationIdForEntry(e.entryIndex);
    if (!map.has(cId)) map.set(cId, []);
    map.get(cId)!.push(e);
  }
  return map;
}

export default function GalaxyScreen() {
  const [seed, setSeed] = useState(FALLBACK_SEED);
  const [groups, setGroups] = useState<Map<string, Entry[]>>(new Map());
  const [startYear, setStartYear] = useState(START_YEAR);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);

    api.get<BackendEntry[]>('/entries')
      .then((data) => {
        if (!Array.isArray(data)) return;
        const all = toEntries(data);
        if (all.length > 0) setStartYear(new Date(all[0].date).getUTCFullYear());
        setGroups(groupByConstellation(all));
      })
      .catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      <GalaxyView seed={seed} groups={groups} startYear={startYear} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050410',
  },
});
```

- [ ] **Step 2: Verify the full app compiles**

```
npx expo lint
```

Expected: no errors.

- [ ] **Step 3: Open `/galaxy` and verify constellations render**

```
npx expo start --web
```

Navigate to `http://localhost:8081/galaxy`. With dev mock data (entries 0–6), one constellation should appear at screen center. Pan and pinch should move/scale the canvas.

- [ ] **Step 4: Commit**

```bash
git add src/app/galaxy.tsx
git commit -m "feat: galaxy screen fetches all entries and renders pan+zoom galaxy"
```
