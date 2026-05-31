# Constellation Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `galaxy` screen that draws deterministic white-star constellations using a per-user seed, with positions computed from the provided `galaxyPositioning` formula.

**Architecture:** Pure positioning functions live in `src/lib/galaxyPositioning.ts`. The seed is persisted alongside the token at login. `src/app/galaxy.tsx` reads the seed, uses 14 mock entries to compute star positions, and renders SVG lines + absolute-positioned star dots on the existing `SpaceBackground`.

**Tech Stack:** React Native (Expo), `react-native-svg` (already installed), `expo-secure-store` (already installed), React Native Reanimated (already installed).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/galaxyPositioning.ts` | Pure positioning functions (TypeScript port) |
| Modify | `src/lib/api.ts` | Add `saveGalaxySeed` / `getStoredSeed` |
| Modify | `src/app/landing.tsx` | Store seed after Google auth |
| Modify | `src/components/auth-modal.tsx` | Store seed after email sign-in/sign-up |
| Modify | `src/app/_layout.tsx` | Register `galaxy` screen in Stack |
| Create | `src/app/galaxy.tsx` | Galaxy screen — mock entries, renders constellations |

---

## Task 1: `src/lib/galaxyPositioning.ts`

**Files:**
- Create: `src/lib/galaxyPositioning.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/galaxyPositioning.ts

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Point = { x: number; y: number };
export type ConstellationCenter = { angle: number; radius: number };
export type View = { centerX: number; centerY: number; zoom: number };

export function generateConstellationShape(
  galaxySeed: number,
  constellationId: string,
  pointCount = 7,
): Point[] {
  const rng = mulberry32(hashSeed(`${galaxySeed}:${constellationId}`));
  const points: Point[] = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2 + (rng() - 0.5) * 0.9;
    const radius = 0.45 + rng() * 0.55;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

export function constellationIdForEntry(entryIndex: number): string {
  return `c${Math.floor(entryIndex / 7)}`;
}

export function slotForEntry(entryIndex: number): number {
  return entryIndex % 7;
}

export function getConstellationCenter(
  date: string,
  startYear: number,
  { ringGap = 90, baseRadius = 40 }: { ringGap?: number; baseRadius?: number } = {},
): ConstellationCenter {
  const d = new Date(date);
  const monthFraction = (d.getMonth() + d.getDate() / 31) / 12;
  const angle = -Math.PI / 2 + monthFraction * Math.PI * 2;
  const yearIndex = d.getFullYear() - startYear;
  return { angle, radius: baseRadius + yearIndex * ringGap };
}

export function starScreenPosition(
  center: ConstellationCenter,
  shapePoint: Point,
  view: View,
  slotRadius = 28,
): Point {
  const cx = view.centerX + Math.cos(center.angle) * center.radius * view.zoom;
  const cy = view.centerY + Math.sin(center.angle) * center.radius * view.zoom;
  return {
    x: cx + shapePoint.x * slotRadius * view.zoom,
    y: cy + shapePoint.y * slotRadius * view.zoom,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/galaxyPositioning.ts
git commit -m "feat: add galaxy positioning utilities"
```

---

## Task 2: Seed storage helpers in `api.ts`

**Files:**
- Modify: `src/lib/api.ts`

The seed is an integer. Persist it as a string (same as other values) under key `galaxy_seed`.

- [ ] **Step 1: Add `saveGalaxySeed` and `getStoredSeed` after the existing `saveToken` function**

Insert after the closing `}` of `saveToken` (currently ends around line 37):

```typescript
export async function saveGalaxySeed(seed: number): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('galaxy_seed', String(seed));
  } else {
    await SecureStore.setItemAsync('galaxy_seed', String(seed));
  }
}

export async function getStoredSeed(): Promise<number | null> {
  let raw: string | null = null;
  if (Platform.OS === 'web') {
    raw = localStorage.getItem('galaxy_seed');
  } else {
    raw = await SecureStore.getItemAsync('galaxy_seed');
  }
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}
```

Also add `saveGalaxySeed` to the `logout` cleanup so seed is removed on sign-out. Inside `logout`, after `SecureStore.deleteItemAsync('pending_email')` / `localStorage.removeItem('pending_email')` add:

```typescript
// in the web branch of logout:
localStorage.removeItem('galaxy_seed');

// in the native branch of logout:
await SecureStore.deleteItemAsync('galaxy_seed');
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add galaxy seed storage helpers"
```

---

## Task 3: Store seed at login

**Files:**
- Modify: `src/app/landing.tsx`
- Modify: `src/components/auth-modal.tsx`

The backend will return `seed` alongside `token` and `newUser`. Until the backend is updated, `seed` may be absent — handle it with an optional field.

- [ ] **Step 1: Update `landing.tsx` — import `saveGalaxySeed` and store seed after Google auth**

In `landing.tsx`, update the import line for `api`:
```typescript
import { api, getStoredToken, getPendingEmail, saveToken, saveGalaxySeed } from '@/lib/api';
```

In `handleGoogleToken`, change the response type and add seed storage:
```typescript
const data = await api.post<{ token: string; newUser: boolean; seed?: number }>(
  '/authorization-google',
  { token: accessToken, provider: 'google' },
  { auth: false },
);
await saveToken(data.token);
if (data.seed !== undefined) await saveGalaxySeed(data.seed);
```

- [ ] **Step 2: Update `auth-modal.tsx` — import and store seed after email sign-in/sign-up**

In `auth-modal.tsx`, update the import for `api`:
```typescript
import { api, BASE_URL, saveToken, saveGalaxySeed } from '@/lib/api';
```

In `handleSubmit`, for the sign-up branch, change the response type and add seed storage:
```typescript
const data = await api.post<{ token: string; newUser: boolean; seed?: number }>(
  '/sign-up',
  { email, password: hashedPassword },
  { auth: false },
);
await saveToken(data.token);
if (data.seed !== undefined) await saveGalaxySeed(data.seed);
```

For the sign-in branch, same change:
```typescript
const data = await api.post<{ token: string; newUser: boolean; seed?: number }>(
  '/sign-in',
  { email, password: hashedPassword },
  { auth: false },
);
await saveToken(data.token);
if (data.seed !== undefined) await saveGalaxySeed(data.seed);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/landing.tsx src/components/auth-modal.tsx
git commit -m "feat: persist galaxy seed at login"
```

---

## Task 4: Register galaxy screen

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Add `<Stack.Screen name="galaxy" />` inside the `<Stack>` block**

The Stack block currently ends with:
```tsx
<Stack.Screen name="(tabs)" />
```

Add after it:
```tsx
<Stack.Screen name="galaxy" />
```

- [ ] **Step 2: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: register galaxy screen in router"
```

---

## Task 5: Create `src/app/galaxy.tsx`

**Files:**
- Create: `src/app/galaxy.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/app/galaxy.tsx
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polyline } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { Palette } from '@/constants/theme';
import {
  constellationIdForEntry,
  generateConstellationShape,
  getConstellationCenter,
  slotForEntry,
  starScreenPosition,
  type Point,
  type View as GalaxyView,
} from '@/lib/galaxyPositioning';
import { getStoredSeed } from '@/lib/api';

const START_YEAR = 2026;
const SLOT_RADIUS = 28;
const FALLBACK_SEED = 42;

const MOCK_ENTRIES: { date: string }[] = [
  // constellation c0
  { date: '2026-01-03' },
  { date: '2026-01-07' },
  { date: '2026-01-12' },
  { date: '2026-01-18' },
  { date: '2026-01-24' },
  { date: '2026-02-02' },
  { date: '2026-02-09' },
  // constellation c1
  { date: '2026-03-05' },
  { date: '2026-03-11' },
  { date: '2026-03-18' },
  { date: '2026-03-25' },
  { date: '2026-04-01' },
  { date: '2026-04-08' },
  { date: '2026-04-15' },
];

const HALO = 22;
const CORE = 7;

function Star({ x, y }: Point) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }, style]}>
      <View style={styles.halo} />
      <View style={styles.core} />
    </Animated.View>
  );
}

type ConstellationData = {
  id: string;
  stars: Point[];
};

function buildConstellations(seed: number, view: GalaxyView): ConstellationData[] {
  // Group entries by constellation id
  const groups = new Map<string, { firstDate: string; slots: { slot: number; date: string }[] }>();

  MOCK_ENTRIES.forEach((entry, idx) => {
    const cId = constellationIdForEntry(idx);
    const slot = slotForEntry(idx);
    if (!groups.has(cId)) {
      groups.set(cId, { firstDate: entry.date, slots: [] });
    }
    groups.get(cId)!.slots.push({ slot, date: entry.date });
  });

  const result: ConstellationData[] = [];

  groups.forEach((group, cId) => {
    const center = getConstellationCenter(group.firstDate, START_YEAR);
    const shape = generateConstellationShape(seed, cId);

    // Build stars array indexed by slot (0-6)
    const stars: Point[] = Array(group.slots.length);
    group.slots.forEach(({ slot }) => {
      stars[slot] = starScreenPosition(center, shape[slot], view, SLOT_RADIUS);
    });

    result.push({ id: cId, stars });
  });

  return result;
}

export default function GalaxyScreen() {
  const { width, height } = useWindowDimensions();
  const [seed, setSeed] = useState<number>(FALLBACK_SEED);

  useEffect(() => {
    getStoredSeed().then((s) => {
      if (s !== null) setSeed(s);
    });
  }, []);

  const view: GalaxyView = { centerX: width / 2, centerY: height / 2, zoom: 1 };
  const constellations = buildConstellations(seed, view);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {constellations.map((c) => (
            <Polyline
              key={c.id}
              points={c.stars.map((s) => `${s.x},${s.y}`).join(' ')}
              fill="none"
              stroke={Palette.brightLavender}
              strokeWidth={1}
              strokeOpacity={0.85}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </Svg>

        {constellations.flatMap((c) =>
          c.stars.map((s, i) => <Star key={`${c.id}-${i}`} x={s.x} y={s.y} />),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050410',
  },
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
    backgroundColor: Palette.brightLavender,
    opacity: 0.25,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: '#ffffff',
  },
});
```

- [ ] **Step 2: Verify in app — navigate to the galaxy screen**

Temporarily add a button to `dashboard.tsx` to navigate to `/galaxy`:

```tsx
// at top of dashboard.tsx, add:
import { useRouter } from 'expo-router';

// inside DashboardScreen, add:
const router = useRouter();

// in the JSX, inside the HUD view, add a pressable:
<Pressable onPress={() => router.push('/galaxy')} style={styles.reset}>
  <Text style={styles.resetText}>Galaxy</Text>
</Pressable>
```

Run the app with `npx expo start` and navigate to the galaxy screen. You should see two clusters of 7 white stars each, connected by thin lavender lines, against the space background. The positions should be stable across reloads.

- [ ] **Step 3: Remove the temporary navigation button from dashboard (optional — keep it for now)**

- [ ] **Step 4: Commit**

```bash
git add src/app/galaxy.tsx
git commit -m "feat: galaxy screen with deterministic constellation rendering"
```
