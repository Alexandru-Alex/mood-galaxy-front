# Onboarding & Constellation Celebration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-launch onboarding splash that gets new users to their first star in under 30 seconds, plus a gentle inline celebration when a constellation of 7 moods is completed.

**Architecture:** Two new isolated components (`OnboardingSplash`, `ConstellationCelebration`) mounted as conditional overlays inside the existing `HomeScreen`. All state is client-side: a `onboarding_complete` flag in SecureStore controls the splash; a `useRef` tracking the last celebrated constellation ID controls the celebration. No backend changes.

**Tech Stack:** React Native, Expo Router, Reanimated 4, react-native-svg, expo-secure-store, expo-haptics, @tanstack/react-query (data already fetched), jest + @testing-library/react-native

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/lib/api.ts` | Add `getOnboardingComplete()` / `setOnboardingComplete()` |
| Create | `src/components/onboarding-splash.tsx` | Fullscreen first-launch modal |
| Create | `src/components/constellation-celebration.tsx` | Sparkles + banner + mini SVG |
| Modify | `src/app/(tabs)/index.tsx` | Mount both components, trigger logic |
| Create | `src/__tests__/onboarding-storage.test.ts` | Unit tests for storage helpers |
| Create | `src/__tests__/onboarding-splash.test.tsx` | Component tests for splash |
| Create | `src/__tests__/constellation-celebration.test.tsx` | Component tests for celebration |

---

## Task 1 — Storage helpers in `api.ts`

**Files:**
- Modify: `src/lib/api.ts`
- Create: `src/__tests__/onboarding-storage.test.ts`

- [ ] **Step 1.1 — Write the failing tests**

Create `src/__tests__/onboarding-storage.test.ts`:

```typescript
import { Platform } from 'react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { getOnboardingComplete, setOnboardingComplete } from '@/lib/api';

const mockGet = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockSet = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset localStorage mock between tests
  (global as any).localStorage = {
    _store: {} as Record<string, string>,
    getItem(k: string) { return this._store[k] ?? null; },
    setItem(k: string, v: string) { this._store[k] = v; },
  };
});

describe('getOnboardingComplete (native)', () => {
  beforeEach(() => { (Platform as any).OS = 'ios'; });

  it('returns false when key is absent', async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(await getOnboardingComplete()).toBe(false);
    expect(mockGet).toHaveBeenCalledWith('onboarding_complete');
  });

  it('returns true when key is "1"', async () => {
    mockGet.mockResolvedValueOnce('1');
    expect(await getOnboardingComplete()).toBe(true);
  });
});

describe('setOnboardingComplete (native)', () => {
  beforeEach(() => { (Platform as any).OS = 'ios'; });

  it('stores "1" under onboarding_complete', async () => {
    mockSet.mockResolvedValueOnce(undefined);
    await setOnboardingComplete();
    expect(mockSet).toHaveBeenCalledWith('onboarding_complete', '1');
  });
});

describe('getOnboardingComplete (web)', () => {
  beforeEach(() => { (Platform as any).OS = 'web'; });

  it('returns false when key is absent', async () => {
    expect(await getOnboardingComplete()).toBe(false);
  });

  it('returns true when key is "1"', async () => {
    (global as any).localStorage.setItem('onboarding_complete', '1');
    expect(await getOnboardingComplete()).toBe(true);
  });
});

describe('setOnboardingComplete (web)', () => {
  beforeEach(() => { (Platform as any).OS = 'web'; });

  it('stores "1" in localStorage', async () => {
    await setOnboardingComplete();
    expect((global as any).localStorage.getItem('onboarding_complete')).toBe('1');
  });
});
```

- [ ] **Step 1.2 — Run tests to verify they fail**

```
npx jest src/__tests__/onboarding-storage.test.ts --no-coverage
```

Expected: FAIL — `getOnboardingComplete` / `setOnboardingComplete` not exported from `@/lib/api`.

- [ ] **Step 1.3 — Add helpers to `src/lib/api.ts`**

Add after `getStoredSeed` (line 57), before the `logout` function:

```typescript
export async function getOnboardingComplete(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('onboarding_complete') === '1';
  }
  const raw = await SecureStore.getItemAsync('onboarding_complete');
  return raw === '1';
}

export async function setOnboardingComplete(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('onboarding_complete', '1');
    return;
  }
  await SecureStore.setItemAsync('onboarding_complete', '1');
}
```

Also add `onboarding_complete` to the `logout` cleanup so it resets on sign-out. In the `logout` function add:
- web branch: `localStorage.removeItem('onboarding_complete');`
- native branch: `await SecureStore.deleteItemAsync('onboarding_complete');`

The full updated `logout`:

```typescript
export async function logout(): Promise<void> {
  _tokenCache = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('is_new_user');
    localStorage.removeItem('pending_email');
    localStorage.removeItem('galaxy_seed');
    localStorage.removeItem('onboarding_complete');
  } else {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('is_new_user');
    await SecureStore.deleteItemAsync('pending_email');
    await SecureStore.deleteItemAsync('galaxy_seed');
    await SecureStore.deleteItemAsync('onboarding_complete');
  }
}
```

- [ ] **Step 1.4 — Run tests to verify they pass**

```
npx jest src/__tests__/onboarding-storage.test.ts --no-coverage
```

Expected: PASS (4 describe blocks, 6 tests).

- [ ] **Step 1.5 — Commit**

```bash
git add src/lib/api.ts src/__tests__/onboarding-storage.test.ts
git commit -m "feat: add onboarding_complete storage helpers"
```

---

## Task 2 — `OnboardingSplash` component

**Files:**
- Create: `src/components/onboarding-splash.tsx`
- Create: `src/__tests__/onboarding-splash.test.tsx`

- [ ] **Step 2.1 — Write the failing tests**

Create `src/__tests__/onboarding-splash.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OnboardingSplash } from '@/components/onboarding-splash';

jest.mock('@/lib/api', () => ({
  setOnboardingComplete: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

import { setOnboardingComplete } from '@/lib/api';
const mockSet = setOnboardingComplete as jest.MockedFunction<typeof setOnboardingComplete>;

describe('OnboardingSplash', () => {
  it('renders title and subtitle', () => {
    const { getByText } = render(
      <OnboardingSplash onBegin={jest.fn()} onSkip={jest.fn()} />,
    );
    expect(getByText('Your moods become stars')).toBeTruthy();
    expect(getByText(/Every feeling you log/)).toBeTruthy();
  });

  it('calls setOnboardingComplete then onBegin when CTA pressed', async () => {
    const onBegin = jest.fn();
    const { getByText } = render(
      <OnboardingSplash onBegin={onBegin} onSkip={jest.fn()} />,
    );
    fireEvent.press(getByText('✦  Log your first mood'));
    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(onBegin).toHaveBeenCalledTimes(1);
    });
  });

  it('calls setOnboardingComplete then onSkip when Skip pressed', async () => {
    const onSkip = jest.fn();
    const { getByText } = render(
      <OnboardingSplash onBegin={jest.fn()} onSkip={onSkip} />,
    );
    fireEvent.press(getByText('Skip'));
    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2.2 — Run tests to verify they fail**

```
npx jest src/__tests__/onboarding-splash.test.tsx --no-coverage
```

Expected: FAIL — `@/components/onboarding-splash` not found.

- [ ] **Step 2.3 — Create `src/components/onboarding-splash.tsx`**

```typescript
import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Palette, Spacing } from '@/constants/theme';
import { setOnboardingComplete } from '@/lib/api';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';

type Props = {
  onBegin: () => void;
  onSkip: () => void;
};

export function OnboardingSplash({ onBegin, onSkip }: Props) {
  // Each element fades + slides up in sequence
  const iconScale = useSharedValue(0);
  const auraOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(16);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(16);
  const btnOpacity = useSharedValue(0);
  const btnY = useSharedValue(16);

  useEffect(() => {
    const timingCfg = { duration: 350, easing: Easing.out(Easing.quad) };
    iconScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
    auraOpacity.value = withTiming(1, { duration: 600 });
    titleOpacity.value = withDelay(150, withTiming(1, timingCfg));
    titleY.value = withDelay(150, withTiming(0, timingCfg));
    subtitleOpacity.value = withDelay(280, withTiming(1, timingCfg));
    subtitleY.value = withDelay(280, withTiming(0, timingCfg));
    btnOpacity.value = withDelay(400, withTiming(1, timingCfg));
    btnY.value = withDelay(400, withTiming(0, timingCfg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  const auraStyle = useAnimatedStyle(() => ({ opacity: auraOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }],
  }));

  async function handleBegin() {
    await setOnboardingComplete();
    onBegin();
  }

  async function handleSkip() {
    await setOnboardingComplete();
    onSkip();
  }

  return (
    <Modal animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.root}>
        <SpaceBackground />
        <Starfield />

        <Pressable style={styles.skip} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>

        <View style={styles.center}>
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.aura, auraStyle]} />
            <Animated.Text style={[styles.icon, iconStyle]}>✦</Animated.Text>
          </View>

          <Animated.Text style={[styles.title, titleStyle]}>
            Your moods become stars
          </Animated.Text>

          <Animated.Text style={[styles.subtitle, subtitleStyle]}>
            Every feeling you log lights up a star{'\n'}
            in your personal galaxy.{'\n'}
            7 stars form a constellation.
          </Animated.Text>

          <Animated.View style={btnStyle}>
            <Pressable style={styles.btn} onPress={handleBegin}>
              <Text style={styles.btnText}>✦  Log your first mood</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050410',
  },
  skip: {
    position: 'absolute',
    top: 56,
    right: Spacing.four,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 13,
    color: 'rgba(168,143,224,0.6)',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: 0,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  aura: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    // radial gradient approximated with a large shadow / border glow
    shadowColor: Palette.brightLavender,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.5,
  },
  icon: {
    fontSize: 48,
    color: '#ffffff',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: Palette.brightLavender,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 32,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Palette.brightLavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mauve,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
```

- [ ] **Step 2.4 — Run tests to verify they pass**

```
npx jest src/__tests__/onboarding-splash.test.tsx --no-coverage
```

Expected: PASS (3 tests).

- [ ] **Step 2.5 — Commit**

```bash
git add src/components/onboarding-splash.tsx src/__tests__/onboarding-splash.test.tsx
git commit -m "feat: add OnboardingSplash component"
```

---

## Task 3 — `ConstellationCelebration` component

**Files:**
- Create: `src/components/constellation-celebration.tsx`
- Create: `src/__tests__/constellation-celebration.test.tsx`

The component renders three layers above the home screen:
1. **Sparkle particles** — 4 `✦` positioned around the constellation center, float up and fade out
2. **Mini SVG constellation** — real generated shape from `generateConstellationShape`, rendered at 60×60 inside the banner
3. **Banner** — slides up from bottom, shows mini SVG + text + "View in galaxy" tap target, auto-dismisses after 5 seconds

- [ ] **Step 3.1 — Write the failing tests**

Create `src/__tests__/constellation-celebration.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ConstellationCelebration } from '@/components/constellation-celebration';
import type { Entry } from '@/lib/entries';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const ENTRIES: Entry[] = [
  { entryIndex: 1, date: '2026-06-01', mood: 'JOYFUL' },
  { entryIndex: 2, date: '2026-06-02', mood: 'CALM' },
  { entryIndex: 3, date: '2026-06-03', mood: 'NEUTRAL' },
  { entryIndex: 4, date: '2026-06-04', mood: 'ANXIOUS' },
  { entryIndex: 5, date: '2026-06-05', mood: 'SAD' },
  { entryIndex: 6, date: '2026-06-06', mood: 'ANGRY' },
  { entryIndex: 7, date: '2026-06-07', mood: 'JOYFUL' },
];

describe('ConstellationCelebration', () => {
  it('renders the completion banner text', () => {
    const { getByText } = render(
      <ConstellationCelebration
        seed={42}
        constellationId="c0"
        entries={ENTRIES}
        constellationX={200}
        constellationY={300}
        onViewGalaxy={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByText('✦  Constellation complete')).toBeTruthy();
    expect(getByText('7 moods · View in galaxy →')).toBeTruthy();
  });

  it('calls onViewGalaxy when banner tap pressed', () => {
    const onViewGalaxy = jest.fn();
    const { getByText } = render(
      <ConstellationCelebration
        seed={42}
        constellationId="c0"
        entries={ENTRIES}
        constellationX={200}
        constellationY={300}
        onViewGalaxy={onViewGalaxy}
        onDismiss={jest.fn()}
      />,
    );
    fireEvent.press(getByText('7 moods · View in galaxy →'));
    expect(onViewGalaxy).toHaveBeenCalledTimes(1);
  });

  it('fires haptic on mount', () => {
    const { impactAsync } = require('expo-haptics');
    render(
      <ConstellationCelebration
        seed={42}
        constellationId="c0"
        entries={ENTRIES}
        constellationX={200}
        constellationY={300}
        onViewGalaxy={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(impactAsync).toHaveBeenCalledWith('light');
  });

  it('calls onDismiss after 5 seconds', () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    render(
      <ConstellationCelebration
        seed={42}
        constellationId="c0"
        entries={ENTRIES}
        constellationX={200}
        constellationY={300}
        onViewGalaxy={jest.fn()}
        onDismiss={onDismiss}
      />,
    );
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
```

- [ ] **Step 3.2 — Run tests to verify they fail**

```
npx jest src/__tests__/constellation-celebration.test.tsx --no-coverage
```

Expected: FAIL — `@/components/constellation-celebration` not found.

- [ ] **Step 3.3 — Create `src/components/constellation-celebration.tsx`**

```typescript
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { MoodColors, Palette } from '@/constants/theme';
import { generateConstellationShape } from '@/lib/galaxyPositioning';
import type { Entry } from '@/lib/entries';

// Maps an x/y in [-1,1] space to SVG coords inside a 60x60 canvas
const MINI_SIZE = 60;
const MINI_PADDING = 8;
const MINI_RANGE = (MINI_SIZE / 2) - MINI_PADDING; // 22

function toSvgCoord(v: number): number {
  return MINI_SIZE / 2 + v * MINI_RANGE;
}

const SPARKLE_OFFSETS: { dx: number; dy: number; delay: number; color: keyof typeof MoodColors }[] = [
  { dx: -28, dy: -20, delay: 0,   color: 'JOYFUL' },
  { dx:  28, dy: -24, delay: 80,  color: 'CALM' },
  { dx: -20, dy:  10, delay: 160, color: 'ANXIOUS' },
  { dx:  24, dy:   8, delay: 240, color: 'SAD' },
];

type Props = {
  seed: number;
  constellationId: string;
  entries: Entry[];          // the 7 completed entries, in slot order
  constellationX: number;    // screen-space X of constellation center
  constellationY: number;    // screen-space Y of constellation center
  onViewGalaxy: () => void;
  onDismiss: () => void;
};

export function ConstellationCelebration({
  seed,
  constellationId,
  entries,
  constellationX,
  constellationY,
  onViewGalaxy,
  onDismiss,
}: Props) {
  const points = generateConstellationShape(seed, constellationId);
  const polylinePoints = points
    .map((p) => `${toSvgCoord(p.x)},${toSvgCoord(p.y)}`)
    .join(' ');

  // Banner slide-up + fade
  const bannerY = useSharedValue(24);
  const bannerOpacity = useSharedValue(0);

  // Sparkle animations — one shared value per sparkle
  const s0y = useSharedValue(0); const s0op = useSharedValue(0);
  const s1y = useSharedValue(0); const s1op = useSharedValue(0);
  const s2y = useSharedValue(0); const s2op = useSharedValue(0);
  const s3y = useSharedValue(0); const s3op = useSharedValue(0);

  const sparkleAnims = [
    { y: s0y, op: s0op },
    { y: s1y, op: s1op },
    { y: s2y, op: s2op },
    { y: s3y, op: s3op },
  ];

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Banner enters after 400ms
    bannerY.value = withDelay(400, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
    bannerOpacity.value = withDelay(400, withTiming(1, { duration: 350 }));

    // Sparkles
    SPARKLE_OFFSETS.forEach(({ delay }, i) => {
      sparkleAnims[i].op.value = withDelay(
        delay,
        withSequence(withTiming(1, { duration: 300 }), withDelay(500, withTiming(0, { duration: 400 }))),
      );
      sparkleAnims[i].y.value = withDelay(
        delay,
        withTiming(-12, { duration: 1200, easing: Easing.out(Easing.quad) }),
      );
    });

    // Auto-dismiss after 5s
    dismissTimer.current = setTimeout(() => {
      bannerOpacity.value = withTiming(0, { duration: 300 });
      bannerY.value = withTiming(16, { duration: 300 });
      setTimeout(onDismiss, 320);
    }, 5000);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerY.value }],
  }));

  const s0Style = useAnimatedStyle(() => ({ opacity: s0op.value, transform: [{ translateY: s0y.value }] }));
  const s1Style = useAnimatedStyle(() => ({ opacity: s1op.value, transform: [{ translateY: s1y.value }] }));
  const s2Style = useAnimatedStyle(() => ({ opacity: s2op.value, transform: [{ translateY: s2y.value }] }));
  const s3Style = useAnimatedStyle(() => ({ opacity: s3op.value, transform: [{ translateY: s3y.value }] }));
  const sparkleStyles = [s0Style, s1Style, s2Style, s3Style];

  function handleViewGalaxy() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    onViewGalaxy();
    onDismiss();
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Sparkles positioned around constellation center */}
      {SPARKLE_OFFSETS.map(({ dx, dy, color }, i) => (
        <Animated.Text
          key={i}
          pointerEvents="none"
          style={[
            styles.sparkle,
            {
              left: constellationX + dx - 6,
              top: constellationY + dy - 6,
              color: MoodColors[color],
            },
            sparkleStyles[i],
          ]}
        >
          ✦
        </Animated.Text>
      ))}

      {/* Banner anchored to bottom, above the CTA button */}
      <Animated.View style={[styles.bannerWrap, bannerStyle]} pointerEvents="box-none">
        <View style={styles.banner}>
          {/* Mini constellation SVG */}
          <View style={styles.miniConstellation}>
            <Svg width={MINI_SIZE} height={MINI_SIZE}>
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke="rgba(168,143,224,0.4)"
                strokeWidth="1"
              />
              {points.map((p, i) => {
                const entry = entries[i];
                const color = entry ? MoodColors[entry.mood] : Palette.mauve;
                return (
                  <Circle
                    key={i}
                    cx={toSvgCoord(p.x)}
                    cy={toSvgCoord(p.y)}
                    r={3.5}
                    fill={color}
                  />
                );
              })}
            </Svg>
          </View>

          {/* Text */}
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>✦  Constellation complete</Text>
            <Pressable onPress={handleViewGalaxy}>
              <Text style={styles.bannerSub}>7 moods · View in galaxy →</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerWrap: {
    position: 'absolute',
    bottom: 100,   // sits above the "How are you feeling" button (~80px tall + padding)
    left: 16,
    right: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(26,16,64,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(139,105,235,0.35)',
    borderRadius: 16,
    padding: 12,
  },
  miniConstellation: {
    width: MINI_SIZE,
    height: MINI_SIZE,
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: 12,
    color: Palette.brightLavender,
  },
});
```

- [ ] **Step 3.4 — Run tests to verify they pass**

```
npx jest src/__tests__/constellation-celebration.test.tsx --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 3.5 — Commit**

```bash
git add src/components/constellation-celebration.tsx src/__tests__/constellation-celebration.test.tsx
git commit -m "feat: add ConstellationCelebration component"
```

---

## Task 4 — Wire into `HomeScreen`

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

This task mounts both new components inside the existing `HomeScreen`. No new tests — the components are already tested in isolation. Manual verification is the check here.

- [ ] **Step 4.1 — Add imports at top of `src/app/(tabs)/index.tsx`**

Add after the existing import block (after line 27):

```typescript
import { router } from 'expo-router';
import { OnboardingSplash } from '@/components/onboarding-splash';
import { ConstellationCelebration } from '@/components/constellation-celebration';
import { getOnboardingComplete } from '@/lib/api';
```

`setOnboardingComplete` is called inside `OnboardingSplash` itself — `HomeScreen` only needs to read the flag.

- [ ] **Step 4.2 — Add state and refs inside `HomeScreen`**

Add after the existing `const [selectedDate, ...]` line (~line 149):

```typescript
// Onboarding splash
const [showSplash, setShowSplash] = useState<boolean>(false);

// Constellation celebration
const celebratedConstellationId = useRef<string | null>(null);
const [showCelebration, setShowCelebration] = useState(false);
```

- [ ] **Step 4.3 — Load onboarding flag on mount**

Add a new `useEffect` after the existing seed/account `useEffect` (~after line 184):

```typescript
useEffect(() => {
  getOnboardingComplete()
    .then((done) => { if (!done) setShowSplash(true); })
    .catch(() => { /* silent — don't block app on storage error */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 4.4 — Add celebration trigger effect**

Add after the effect above:

```typescript
useEffect(() => {
  if (
    currentEntries.length === MAX_SLOTS &&
    currentCId !== celebratedConstellationId.current
  ) {
    celebratedConstellationId.current = currentCId;
    setShowCelebration(true);
  }
}, [currentEntries.length, currentCId]);
```

- [ ] **Step 4.5 — Compute constellation screen position**

Add after the existing `const mascotPos` line (~line 197):

```typescript
const constellationScreenX = view.centerX + Math.cos(center.angle) * center.radius;
const constellationScreenY = view.centerY + Math.sin(center.angle) * center.radius;
```

- [ ] **Step 4.6 — Mount both components in JSX**

Inside the `return` block, add both components as the last children of the root `<View style={styles.container}>`, after `<DayNotesSheet ... />`:

```tsx
{showSplash && (
  <OnboardingSplash
    onBegin={() => {
      setShowSplash(false);
      bottomSheetRef.current?.present();
    }}
    onSkip={() => setShowSplash(false)}
  />
)}

{showCelebration && (
  <ConstellationCelebration
    seed={seed}
    constellationId={currentCId}
    entries={currentEntries}
    constellationX={constellationScreenX}
    constellationY={constellationScreenY}
    onViewGalaxy={() => router.push('/(tabs)/galaxy')}
    onDismiss={() => setShowCelebration(false)}
  />
)}
```

- [ ] **Step 4.7 — Run full test suite**

```
npx jest --no-coverage
```

Expected: all existing tests pass, new tests pass.

- [ ] **Step 4.8 — Commit**

```bash
git add src/app/(tabs)/index.tsx
git commit -m "feat: wire onboarding splash and constellation celebration into HomeScreen"
```

---

## Verification checklist (manual)

After all tasks are complete, run the app and verify:

- [ ] Fresh install (or clear `onboarding_complete` from SecureStore): splash appears on first open
- [ ] Tapping "Log your first mood" opens JournalSheet immediately
- [ ] Tapping "Skip" dismisses splash without opening modal
- [ ] Second app open: splash does NOT appear
- [ ] Log 7 moods in one constellation: sparkles appear, banner slides up, mini constellation shows the real shape with correct mood colors
- [ ] Banner auto-dismisses after 5 seconds
- [ ] Tapping "View in galaxy →" navigates to Galaxy tab
- [ ] Second constellation completion: celebration fires again for the new one
- [ ] Logout → splash reappears on next login (flag cleared)
