# Void Meditation Timer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Void" fullscreen meditation timer as the 3rd center tab, with an animated accretion-disk black hole, preset durations, no-cancel policy, and a completion screen.

**Architecture:** A `VoidContext` holds all timer state and runs an `AppState`-aware countdown that survives tab navigation. A reusable `BlackHole` component renders the accretion-disk animation at any size. The `VoidScreen` renders one of three sub-views (`selecting | running | complete`) driven by context state.

**Tech Stack:** React Native + Expo Router v56, `react-native-reanimated` 4.3.1, `expo-audio`, `expo-haptics` (to install), `expo-app-state` via `AppState` RN core.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/context/void-context.tsx` | Create | Timer state machine, countdown, haptics, chime |
| `src/components/black-hole.tsx` | Create | Reusable animated accretion disk (two sizes) |
| `src/app/(tabs)/void.tsx` | Create | Void screen — selecting / running / complete views |
| `src/components/app-tabs.tsx` | Modify | Add 5th center tab with disk icon + pulsing ring |
| `src/app/_layout.tsx` | Modify | Wrap with `VoidProvider` |
| `assets/audio/chime.mp3` | Add | One-shot chime sound (provide royalty-free file) |
| `src/__tests__/void-context.test.ts` | Create | Unit tests for timer logic |

---

## Task 1: Install expo-haptics and add chime sound

**Files:**
- Modify: `package.json` (via install command)
- Add: `assets/audio/chime.mp3`

- [ ] **Step 1: Install expo-haptics**

```bash
npx expo install expo-haptics
```

Expected output: package added to `package.json` with version matching SDK 56.

- [ ] **Step 2: Add chime audio file**

Download any royalty-free short chime/bell `.mp3` (e.g. from freesound.org) and save it as:

```
assets/audio/chime.mp3
```

The file must be a valid MP3, 1–3 seconds long, soft/gentle tone. This file is required before Task 2 can play it.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json assets/audio/chime.mp3
git commit -m "feat(void): install expo-haptics, add chime audio asset"
```

---

## Task 2: VoidContext — timer state machine

**Files:**
- Create: `src/context/void-context.tsx`
- Create: `src/__tests__/void-context.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/void-context.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { VoidProvider, useVoid } from '@/context/void-context';

jest.useFakeTimers();

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn() })),
}));

jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  currentState: 'active',
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(VoidProvider, null, children);
}

describe('useVoid', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('transitions to running when startSession is called', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    act(() => {
      result.current.startSession(300); // 5 minutes
    });
    expect(result.current.status).toBe('running');
    expect(result.current.durationSeconds).toBe(300);
    expect(result.current.remainingSeconds).toBe(300);
  });

  it('counts down each second', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    act(() => {
      result.current.startSession(300);
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.remainingSeconds).toBe(297);
  });

  it('transitions to complete when countdown reaches 0', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    act(() => {
      result.current.startSession(2);
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.status).toBe('complete');
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('resets back to idle after resetSession', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    act(() => {
      result.current.startSession(10);
    });
    act(() => {
      result.current.resetSession();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.durationSeconds).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/__tests__/void-context.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/context/void-context'"

- [ ] **Step 3: Create VoidContext**

Create `src/context/void-context.tsx`:

```typescript
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type VoidStatus = 'idle' | 'running' | 'complete';

type VoidContextValue = {
  status: VoidStatus;
  durationSeconds: number;
  remainingSeconds: number;
  startSession: (durationSeconds: number) => void;
  resetSession: () => void;
};

const VoidContext = createContext<VoidContextValue>({
  status: 'idle',
  durationSeconds: 0,
  remainingSeconds: 0,
  startSession: () => {},
  resetSession: () => {},
});

export function VoidProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VoidStatus>('idle');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Store start time to survive app backgrounding
  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startSession(seconds: number) {
    clearTimer();
    setDurationSeconds(seconds);
    setRemainingSeconds(seconds);
    durationRef.current = seconds;
    startedAtRef.current = Date.now();
    setStatus('running');
  }

  function resetSession() {
    clearTimer();
    setStatus('idle');
    setDurationSeconds(0);
    setRemainingSeconds(0);
    startedAtRef.current = null;
  }

  async function handleComplete() {
    clearTimer();
    setRemainingSeconds(0);
    setStatus('complete');
    // Haptic feedback
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    // Chime sound
    try {
      const player = createAudioPlayer(require('../../assets/audio/chime.mp3'));
      player.play();
      // Remove after 4 seconds (chime is short)
      setTimeout(() => player.remove(), 4000);
    } catch {}
  }

  // Recalculate remaining from wall-clock time (survives backgrounding)
  function tick() {
    if (startedAtRef.current === null) return;
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const remaining = Math.max(0, durationRef.current - elapsed);
    setRemainingSeconds(remaining);
    if (remaining === 0) {
      handleComplete();
    }
  }

  useEffect(() => {
    if (status !== 'running') return;
    intervalRef.current = setInterval(tick, 1000);
    return clearTimer;
  }, [status]);

  // Re-sync when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && status === 'running') {
        tick();
      }
    });
    return () => sub.remove();
  }, [status]);

  return (
    <VoidContext.Provider value={{ status, durationSeconds, remainingSeconds, startSession, resetSession }}>
      {children}
    </VoidContext.Provider>
  );
}

export const useVoid = () => useContext(VoidContext);
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/void-context.test.ts --no-coverage
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/context/void-context.tsx src/__tests__/void-context.test.ts
git commit -m "feat(void): add VoidContext with AppState-aware countdown timer"
```

---

## Task 3: BlackHole component

**Files:**
- Create: `src/components/black-hole.tsx`

- [ ] **Step 1: Create the BlackHole component**

Create `src/components/black-hole.tsx`:

```typescript
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

import { Palette } from '@/constants/theme';

type BlackHoleSize = 'full' | 'nav' | 'preview';

const SIZE_CONFIG = {
  full:    { container: 160, ring1: { w: 160, h: 46 }, ring2: { w: 120, h: 34 }, ring3: { w: 80,  h: 23 }, core: 44 },
  preview: { container: 110, ring1: { w: 110, h: 31 }, ring2: { w: 82,  h: 23 }, ring3: { w: 55,  h: 16 }, core: 30 },
  nav:     { container: 42,  ring1: { w: 42,  h: 12 }, ring2: { w: 31,  h: 8.5},ring3: null,              core: 13 },
} as const;

type Props = {
  size: BlackHoleSize;
  active?: boolean;
};

export function BlackHole({ size, active = true }: Props) {
  const cfg = SIZE_CONFIG[size];

  const rot1 = useSharedValue(0); // clockwise
  const rot2 = useSharedValue(0); // counter-clockwise
  const rot3 = useSharedValue(0); // clockwise (full/preview only)

  useEffect(() => {
    if (!active) {
      cancelAnimation(rot1);
      cancelAnimation(rot2);
      cancelAnimation(rot3);
      return;
    }
    rot1.value = withRepeat(withTiming(360,  { duration: 4000,  easing: Easing.linear }), -1, false);
    rot2.value = withRepeat(withTiming(-360, { duration: 2800,  easing: Easing.linear }), -1, false);
    rot3.value = withRepeat(withTiming(360,  { duration: 2000,  easing: Easing.linear }), -1, false);
  }, [active]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ rotateX: '70deg' }, { rotateZ: `${rot1.value}deg` }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ rotateX: '70deg' }, { rotateZ: `${rot2.value}deg` }],
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ rotateX: '70deg' }, { rotateZ: `${rot3.value}deg` }],
  }));

  const tilt = size === 'nav' ? '65deg' : '70deg';

  return (
    <View style={[styles.container, { width: cfg.container, height: cfg.container }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: cfg.ring1.w,
            height: cfg.ring1.h,
            borderColor: `rgba(171,129,205,0.75)`, // Palette.brightLavender
            borderWidth: size === 'nav' ? 1.5 : 3,
            shadowColor: Palette.brightLavender,
            shadowOpacity: 0.5,
            shadowRadius: size === 'nav' ? 4 : 10,
            shadowOffset: { width: 0, height: 0 },
          },
          ring1Style,
          { transform: [{ rotateX: tilt }, { rotateZ: `${rot1.value}deg` }] },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: cfg.ring2.w,
            height: cfg.ring2.h,
            borderColor: `rgba(226,173,242,0.45)`, // Palette.mauve
            borderWidth: size === 'nav' ? 1.5 : 2,
          },
          ring2Style,
          { transform: [{ rotateX: tilt }, { rotateZ: `${rot2.value}deg` }] },
        ]}
      />
      {cfg.ring3 && (
        <Animated.View
          style={[
            styles.ring,
            {
              width: cfg.ring3.w,
              height: cfg.ring3.h,
              borderColor: `rgba(87,74,226,0.55)`, // Palette.majorelleBlue
              borderWidth: 2,
            },
            ring3Style,
            { transform: [{ rotateX: tilt }, { rotateZ: `${rot3.value}deg` }] },
          ]}
        />
      )}
      <View
        style={[
          styles.core,
          {
            width: cfg.core,
            height: cfg.core,
            shadowColor: Palette.brightLavender,
            shadowOpacity: size === 'nav' ? 0.9 : 0.7,
            shadowRadius: size === 'nav' ? 8 : 20,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderStyle: 'solid',
  },
  core: {
    borderRadius: 999,
    backgroundColor: '#050410',
    zIndex: 2,
    elevation: 4,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `black-hole.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/black-hole.tsx
git commit -m "feat(void): add BlackHole animated accretion disk component"
```

---

## Task 4: VoidScreen — three sub-views

**Files:**
- Create: `src/app/(tabs)/void.tsx`

- [ ] **Step 1: Create the void screen**

Create `src/app/(tabs)/void.tsx`:

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlackHole } from '@/components/black-hole';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { useVoid } from '@/context/void-context';
import { Palette } from '@/constants/theme';

const PRESETS = [
  { label: '5m',  seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '20m', seconds: 1200 },
  { label: '30m', seconds: 1800 },
  { label: '60m', seconds: 3600 },
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export default function VoidScreen() {
  const { status, durationSeconds, remainingSeconds, startSession, resetSession } = useVoid();
  const insets = useSafeAreaInsets();

  if (status === 'running') {
    return <ActiveSession remainingSeconds={remainingSeconds} />;
  }
  if (status === 'complete') {
    return <CompleteScreen durationSeconds={durationSeconds} onReset={resetSession} />;
  }
  return <SelectionScreen onStart={startSession} insetTop={insets.top} />;
}

function SelectionScreen({ onStart, insetTop }: { onStart: (s: number) => void; insetTop: number }) {
  const [selected, setSelected] = React.useState<number | null>(null);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield count={50} />

      <View style={[styles.selectionContent, { paddingTop: insetTop + 24 }]}>
        <Text style={styles.title}>VOID</Text>
        <Text style={styles.subtitle}>Enter the silence</Text>

        <BlackHole size="preview" />

        <Text style={styles.durationLabel}>Duration</Text>

        <View style={styles.presetRow}>
          {PRESETS.map(({ label, seconds }) => (
            <Pressable
              key={seconds}
              onPress={() => setSelected(seconds)}
              style={[
                styles.presetBtn,
                selected === seconds && styles.presetBtnSelected,
              ]}
            >
              <Text style={[styles.presetText, selected === seconds && styles.presetTextSelected]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => selected !== null && onStart(selected)}
          style={[styles.ctaBtn, selected === null && styles.ctaBtnDisabled]}
        >
          <Text style={styles.ctaText}>Enter Void</Text>
        </Pressable>
      </View>
    </View>
  );
}

// React import needed for useState in SelectionScreen
import React from 'react';

function ActiveSession({ remainingSeconds }: { remainingSeconds: number }) {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield count={50} />
      <View style={styles.activeContent}>
        <BlackHole size="full" />
        <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
        <Text style={styles.timerLabel}>remaining</Text>
      </View>
    </View>
  );
}

function CompleteScreen({ durationSeconds, onReset }: { durationSeconds: number; onReset: () => void }) {
  const minutes = Math.round(durationSeconds / 60);
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield count={50} />
      <View style={styles.completeContent}>
        {/* Dimmed static core — no rings */}
        <View style={styles.completeCoreWrap}>
          <View style={styles.completeCoreFade} />
          <View style={styles.completeCore} />
        </View>

        <Text style={styles.completeTitle}>You emerged</Text>
        <Text style={styles.completeSubtitle}>from the void</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryDuration}>{minutes < 1 ? '<1' : String(minutes)}</Text>
          <Text style={styles.summaryLabel}>minutes in silence</Text>
        </View>

        <Pressable onPress={onReset} style={styles.ctaBtn}>
          <Text style={styles.ctaText}>Back to galaxy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050410',
  },
  // Selection
  selectionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#f3eefb',
    letterSpacing: 6,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#b9b3d6',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 28,
  },
  durationLabel: {
    fontSize: 10,
    color: 'rgba(185,179,214,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    marginTop: 26,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  presetBtn: {
    backgroundColor: 'rgba(34,42,104,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  presetBtnSelected: {
    backgroundColor: 'rgba(87,74,226,0.35)',
    borderColor: Palette.brightLavender,
  },
  presetText: {
    fontSize: 13,
    color: '#b9b3d6',
  },
  presetTextSelected: {
    color: '#e2adf2',
  },
  ctaBtn: {
    backgroundColor: Palette.majorelleBlue,
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 12,
  },
  ctaBtnDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f3eefb',
    letterSpacing: 0.3,
  },
  // Active session
  activeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  timerText: {
    fontSize: 52,
    fontWeight: '200',
    color: '#f3eefb',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
    marginTop: 24,
  },
  timerLabel: {
    fontSize: 10,
    color: '#b9b3d6',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 6,
  },
  // Complete
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  completeCoreWrap: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  completeCoreFade: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(87,74,226,0.12)',
  },
  completeCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#050410',
    shadowColor: Palette.brightLavender,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: '#f3eefb',
    letterSpacing: 0.5,
  },
  completeSubtitle: {
    fontSize: 11,
    color: '#b9b3d6',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  summaryCard: {
    backgroundColor: 'rgba(34,42,104,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  summaryDuration: {
    fontSize: 32,
    fontWeight: '200',
    color: Palette.brightLavender,
    letterSpacing: 2,
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(185,179,214,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 3,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `void.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(tabs\)/void.tsx
git commit -m "feat(void): add VoidScreen with selecting/running/complete sub-views"
```

---

## Task 5: Update app-tabs.tsx — add center Void tab

**Files:**
- Modify: `src/components/app-tabs.tsx`

- [ ] **Step 1: Update app-tabs.tsx**

Replace the full content of `src/components/app-tabs.tsx` with:

```typescript
import { useEffect } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlackHole } from '@/components/black-hole';
import { Palette } from '@/constants/theme';
import { useVoid } from '@/context/void-context';

type TabIconProps = TabTriggerSlotProps & {
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
};

function TabIconButton({ isFocused, icon, iconOutline, ...props }: TabIconProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabBtn, pressed && { opacity: 0.6 }]}
    >
      <Ionicons
        name={isFocused ? icon : iconOutline}
        size={26}
        color={isFocused ? Palette.brightLavender : 'rgba(255,255,255,0.38)'}
      />
    </Pressable>
  );
}

type VoidTabButtonProps = TabTriggerSlotProps;

function VoidTabButton({ isFocused, ...props }: VoidTabButtonProps) {
  const { status } = useVoid();
  const isRunning = status === 'running';

  const pulseScale = useSharedValue(0.8);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRunning) {
      pulseScale.value = withRepeat(
        withTiming(1.4, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 0.8;
      pulseOpacity.value = 0;
    }
  }, [isRunning]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.voidTabBtn, pressed && { opacity: 0.7 }]}
    >
      {isRunning && (
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
      )}
      <BlackHole size="nav" active={true} />
    </Pressable>
  );
}

function BottomBar({ children, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      {children}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <BottomBar>
          <TabTrigger name="index" href="/" asChild>
            <TabIconButton icon="home" iconOutline="home-outline" />
          </TabTrigger>
          <TabTrigger name="galaxy" href="/galaxy" asChild>
            <TabIconButton icon="planet" iconOutline="planet-outline" />
          </TabTrigger>
          <TabTrigger name="void" href="/void" asChild>
            <VoidTabButton />
          </TabTrigger>
          <TabTrigger name="journal" href="/journal" asChild>
            <TabIconButton icon="book" iconOutline="book-outline" />
          </TabTrigger>
          <TabTrigger name="you" href="/you" asChild>
            <TabIconButton icon="person" iconOutline="person-outline" />
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 4, 16, 0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(171, 129, 205, 0.25)',
    paddingTop: 10,
    alignItems: 'center',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  voidTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(171,129,205,0.5)',
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-tabs.tsx
git commit -m "feat(void): add Void center tab with animated disk icon and pulsing ring"
```

---

## Task 6: Wire VoidProvider into root layout

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Add VoidProvider to _layout.tsx**

In `src/app/_layout.tsx`, add the import:

```typescript
import { VoidProvider } from '@/context/void-context';
```

Then wrap the children — place `<VoidProvider>` inside `<AudioProvider>` (so audio is available to VoidContext):

```typescript
// Before (inside RootLayout return):
<AudioProvider>
  <ThemeProvider ...>
    ...
  </ThemeProvider>
</AudioProvider>

// After:
<AudioProvider>
  <VoidProvider>
    <ThemeProvider ...>
      ...
    </ThemeProvider>
  </VoidProvider>
</AudioProvider>
```

- [ ] **Step 2: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all existing tests pass, void-context tests pass.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat(void): wire VoidProvider into root layout"
```

---

## Task 7: Manual smoke test

- [ ] **Step 1: Start the app**

```bash
npx expo start
```

Open on a device or emulator (iOS simulator or Android emulator).

- [ ] **Step 2: Verify tab bar**
  - 5 tabs visible, center icon is the animated accretion disk (~42px), larger than the other 4 icons (22px)
  - Disk rings animate continuously

- [ ] **Step 3: Verify SelectionScreen**
  - Tap the center tab → VOID title, "Enter the silence", preview black hole, 5 preset buttons
  - "Enter Void" button is dimmed before selecting a preset
  - Tap "10m" → button highlights in lavender, "Enter Void" becomes active

- [ ] **Step 4: Verify ActiveSession**
  - Tap "Enter Void" → fullscreen black hole + countdown timer
  - Navigate to another tab → timer continues (visible from pulsing ring on Void tab icon)
  - Return to Void tab → timer still counting

- [ ] **Step 5: Verify completion (use 5m preset — or temporarily lower to 5s for testing)**

  To test quickly, temporarily change PRESETS in `void.tsx` to include a 5-second option:
  ```typescript
  { label: '5s', seconds: 5 },
  ```
  Start a 5s session → at 0: haptic feedback + chime plays → "You emerged from the void" screen shows with duration → "Back to galaxy" resets to SelectionScreen.

  Remove the `5s` preset after testing.

- [ ] **Step 6: Final commit**

```bash
git add -p  # stage only intentional changes
git commit -m "feat(void): complete Void meditation timer feature"
```
