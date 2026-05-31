# Dashboard Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tap-to-place dashboard with a real constellation view that shows the current group of entries as filled stars, previews remaining slots as ghost stars, and lets the user add a new entry via an inline mood picker.

**Architecture:** A shared `ConstellationCanvas` component handles all star rendering (filled + ghost + SVG lines). `MoodPicker` is a standalone animated row. `dashboard.tsx` orchestrates data fetching, picker state, and entry creation. `galaxy.tsx` is simplified to use `ConstellationCanvas` instead of inline rendering.

**Tech Stack:** React Native (Expo), `react-native-svg` (Polyline + strokeDasharray for dashed lines), React Native Reanimated (picker animation), `expo-secure-store` / api.ts (seed + auth).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/constellation-canvas.tsx` | Renders all 7 slots: filled stars, ghost stars, solid + dashed SVG lines |
| Create | `src/components/mood-picker.tsx` | Animated inline row of 6 mood buttons |
| Rewrite | `src/app/galaxy.tsx` | Simplified — uses ConstellationCanvas, removes inline logic |
| Rewrite | `src/app/dashboard.tsx` | Fetches entries, manages picker state, uses ConstellationCanvas + MoodPicker |
| Delete | `src/styles/dashboard.styles.ts` | Styles moved inline to dashboard.tsx |

---

## Task 1: `src/components/constellation-canvas.tsx`

**Files:**
- Create: `src/components/constellation-canvas.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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

export type Entry = { entryIndex: number; date: string; mood: string };

const SLOT_RADIUS = 120;
const HALO = 22;
const CORE = 7;

function FilledStar({ x, y }: Point) {
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

function GhostStar({ x, y }: Point) {
  return (
    <View style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }]}>
      <View style={styles.ghost} />
    </View>
  );
}

type Props = {
  seed: number;
  entries: Entry[];
  startYear: number;
  width: number;
  height: number;
};

export function ConstellationCanvas({ seed, entries, startYear, width, height }: Props) {
  const view: GalaxyView = { centerX: width / 2, centerY: height / 2, zoom: 1 };
  const cId = entries.length > 0 ? constellationIdForEntry(entries[0].entryIndex) : 'c0';
  const centerDate =
    entries.length > 0 ? entries[0].date : new Date().toISOString().slice(0, 10);

  const center = getConstellationCenter(centerDate, startYear);
  const shape = generateConstellationShape(seed, cId);
  const allPositions = shape.map((p) => starScreenPosition(center, p, view, SLOT_RADIUS));
  const filledSlots = new Set(entries.map((e) => slotForEntry(e.entryIndex)));
  const filledPositions = allPositions.filter((_, i) => filledSlots.has(i));

  const ghostPoints = allPositions.map((p) => `${p.x},${p.y}`).join(' ');
  const solidPoints = filledPositions.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
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
        filledSlots.has(i) ? <FilledStar key={`f-${i}`} x={p.x} y={p.y} /> : null,
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
    backgroundColor: Palette.brightLavender,
    opacity: 0.25,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: '#ffffff',
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

- [ ] **Step 2: Commit**

```bash
git add src/components/constellation-canvas.tsx
git commit -m "feat: add ConstellationCanvas with filled and ghost stars"
```

---

## Task 2: `src/components/mood-picker.tsx`

**Files:**
- Create: `src/components/mood-picker.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Palette, Spacing } from '@/constants/theme';

export type Mood = 'JOYFUL' | 'CALM' | 'NEUTRAL' | 'ANXIOUS' | 'SAD' | 'ANGRY';

const MOODS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: 'JOYFUL', emoji: '✦', label: 'Joyful' },
  { mood: 'CALM', emoji: '◉', label: 'Calm' },
  { mood: 'NEUTRAL', emoji: '○', label: 'Neutral' },
  { mood: 'ANXIOUS', emoji: '◈', label: 'Anxious' },
  { mood: 'SAD', emoji: '◇', label: 'Sad' },
  { mood: 'ANGRY', emoji: '◆', label: 'Angry' },
];

type Props = {
  visible: boolean;
  onSelect: (mood: Mood) => void;
};

export function MoodPicker({ visible, onSelect }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
    translateY.value = withSpring(visible ? 0 : 16, { damping: 18, stiffness: 200 });
  }, [visible, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.picker, style]} pointerEvents={visible ? 'auto' : 'none'}>
      {MOODS.map(({ mood, emoji, label }) => (
        <Pressable key={mood} style={styles.moodBtn} onPress={() => onSelect(mood)}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: 'rgba(30, 24, 58, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(171, 129, 205, 0.3)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  moodBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.one,
  },
  emoji: {
    fontSize: 18,
    color: Palette.mauve,
  },
  label: {
    fontSize: 9,
    color: Palette.brightLavender,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mood-picker.tsx
git commit -m "feat: add MoodPicker inline component"
```

---

## Task 3: Refactor `src/app/galaxy.tsx`

**Files:**
- Rewrite: `src/app/galaxy.tsx`

Replace all inline `Star`, `buildConstellations`, and rendering logic with `ConstellationCanvas`.

- [ ] **Step 1: Rewrite the file**

```tsx
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ConstellationCanvas, type Entry } from '@/components/constellation-canvas';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { getStoredSeed } from '@/lib/api';

const START_YEAR = 2026;
const FALLBACK_SEED = 42;

const MOCK_ENTRIES: Entry[] = [
  { entryIndex: 0, date: '2026-01-03', mood: 'JOYFUL' },
  { entryIndex: 1, date: '2026-01-07', mood: 'CALM' },
  { entryIndex: 2, date: '2026-01-12', mood: 'NEUTRAL' },
  { entryIndex: 3, date: '2026-01-18', mood: 'SAD' },
  { entryIndex: 4, date: '2026-01-24', mood: 'ANGRY' },
  { entryIndex: 5, date: '2026-02-02', mood: 'JOYFUL' },
  { entryIndex: 6, date: '2026-02-09', mood: 'CALM' },
];

export default function GalaxyScreen() {
  const { width, height } = useWindowDimensions();
  const [seed, setSeed] = useState(FALLBACK_SEED);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      <ConstellationCanvas
        seed={seed}
        entries={MOCK_ENTRIES}
        startYear={START_YEAR}
        width={width}
        height={height}
      />
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

- [ ] **Step 2: Commit**

```bash
git add src/app/galaxy.tsx
git commit -m "refactor: galaxy uses ConstellationCanvas"
```

---

## Task 4: Rewrite `src/app/dashboard.tsx` + delete `src/styles/dashboard.styles.ts`

**Files:**
- Rewrite: `src/app/dashboard.tsx`
- Delete: `src/styles/dashboard.styles.ts`

- [ ] **Step 1: Rewrite `src/app/dashboard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConstellationCanvas, type Entry } from '@/components/constellation-canvas';
import { MoodPicker, type Mood } from '@/components/mood-picker';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { Palette, Spacing } from '@/constants/theme';
import { api, getStoredSeed } from '@/lib/api';

const FALLBACK_SEED = 42;
const START_YEAR = 2026;

const MOCK_ENTRIES: Entry[] = [
  { entryIndex: 0, date: '2026-01-03', mood: 'JOYFUL' },
  { entryIndex: 1, date: '2026-01-07', mood: 'CALM' },
  { entryIndex: 2, date: '2026-01-12', mood: 'NEUTRAL' },
  { entryIndex: 3, date: '2026-01-18', mood: 'SAD' },
];

export default function DashboardScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(FALLBACK_SEED);
  const [entries, setEntries] = useState<Entry[]>(MOCK_ENTRIES);
  const [startYear, setStartYear] = useState(START_YEAR);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);

    api.get<{ entries: Entry[]; startYear: number }>('/entries/current')
      .then((data) => {
        setEntries(data.entries);
        setStartYear(data.startYear);
      })
      .catch(console.error);
  }, []);

  const handleMoodSelect = async (mood: Mood) => {
    setPickerVisible(false);
    setSubmitting(true);
    try {
      await api.post('/entries', { mood });
      const data = await api.get<{ entries: Entry[]; startYear: number }>('/entries/current');
      setEntries(data.entries);
      setStartYear(data.startYear);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const canAdd = entries.length < 7 && !submitting;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      <ConstellationCanvas
        seed={seed}
        entries={entries}
        startYear={startYear}
        width={width}
        height={height}
      />

      {pickerVisible && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setPickerVisible(false)}
        />
      )}

      <View
        style={[styles.hud, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        pointerEvents="box-none">
        <View style={styles.hudTop} pointerEvents="none">
          <Text style={styles.counter}>{entries.length} / 7</Text>
          <Text style={styles.hint}>
            {entries.length >= 7 ? 'Constellation complete ✦' : 'Add your mood for today'}
          </Text>
        </View>

        <View style={styles.bottomArea} pointerEvents="box-none">
          <MoodPicker visible={pickerVisible} onSelect={handleMoodSelect} />
          {canAdd && (
            <Pressable
              style={styles.addBtn}
              onPress={() => setPickerVisible((v) => !v)}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050410',
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  hudTop: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  counter: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.mauve,
    letterSpacing: 1,
  },
  hint: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.brightLavender,
    letterSpacing: 0.3,
  },
  bottomArea: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(87, 74, 226, 0.85)',
    borderWidth: 1,
    borderColor: Palette.brightLavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
  },
});
```

- [ ] **Step 2: Delete `src/styles/dashboard.styles.ts`**

```bash
git rm src/styles/dashboard.styles.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard.tsx
git commit -m "feat: dashboard shows current constellation with mood picker"
```
