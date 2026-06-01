# Journal Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline MoodPicker popup with a `@gorhom/bottom-sheet` bottom sheet that lets users pick a mood, write an optional thought, and submit via `POST /journal`, with the new star animating into the constellation on success.

**Architecture:** A new `JournalSheet` component wraps `BottomSheetModal` and owns the submit flow (mood selection, text input, API call). The dashboard opens it imperatively via a ref and receives refreshed entries via `onSubmitSuccess`. Star feedback is already handled by the existing `FilledStar` mount animation in `ConstellationCanvas` — no extra work needed.

**Tech Stack:** `@gorhom/bottom-sheet@^5`, `react-native-reanimated@4`, `react-native-gesture-handler@2`, TypeScript

---

### Task 1: Install @gorhom/bottom-sheet and wire up providers

**Files:**
- Modify: `package.json` (via npx expo install)
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Install the package**

```bash
npx expo install @gorhom/bottom-sheet@^5
```

Expected: package added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Update `_layout.tsx` to add required providers**

`GestureHandlerRootView` must be the outermost wrapper. `BottomSheetModalProvider` must wrap anything that uses `BottomSheetModal`.

Replace the full content of `src/app/_layout.tsx` with:

```tsx
import { Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AudioProvider } from '@/context/audio-context';
import { getStoredToken } from '@/lib/api';

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    getStoredToken().then((token) => {
      const onLanding = segments[0] === 'landing';
      if (!token && !onLanding) {
        router.replace('/landing');
      }
    });
  }, [segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ Sora_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
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
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Verify the app still launches**

```bash
npx expo start
```

Expected: app boots without errors. Dashboard loads as before.

- [ ] **Step 4: Commit**

```bash
git add package.json src/app/_layout.tsx
git commit -m "feat: add @gorhom/bottom-sheet with GestureHandlerRootView and BottomSheetModalProvider"
```

---

### Task 2: Extract shared BackendEntry type

**Files:**
- Create: `src/lib/types.ts`
- Modify: `src/app/dashboard.tsx` (import only, no logic change)

- [ ] **Step 1: Create `src/lib/types.ts`**

```ts
export type BackendEntry = {
  entryDate: string;
  mood: string;
  entryIndex?: number;
};

export type CreateJournalNoteResponse = {
  id: string;
  createdAt: string;
};
```

- [ ] **Step 2: Update `dashboard.tsx` to import from types.ts**

Remove the local type definition at line 49:
```ts
// DELETE this line:
type BackendEntry = { entryDate: string; mood: string; entryIndex?: number };
```

Add import at the top of `src/app/dashboard.tsx` (after existing imports):
```ts
import type { BackendEntry } from '@/lib/types';
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/app/dashboard.tsx
git commit -m "refactor: extract BackendEntry type to src/lib/types.ts"
```

---

### Task 3: Create JournalSheet component

**Files:**
- Create: `src/components/journal-sheet.tsx`

- [ ] **Step 1: Create `src/components/journal-sheet.tsx`**

```tsx
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { MoodColors, Palette, Spacing, type Mood } from '@/constants/theme';
import { api } from '@/lib/api';
import type { BackendEntry, CreateJournalNoteResponse } from '@/lib/types';

const MOODS: { mood: Mood; label: string }[] = [
  { mood: 'JOYFUL', label: 'Joyful' },
  { mood: 'CALM', label: 'Calm' },
  { mood: 'NEUTRAL', label: 'Neutral' },
  { mood: 'ANXIOUS', label: 'Anxious' },
  { mood: 'SAD', label: 'Sad' },
  { mood: 'ANGRY', label: 'Angry' },
];

type Props = {
  onSubmitSuccess: (entries: BackendEntry[]) => void;
};

export const JournalSheet = forwardRef<BottomSheetModal, Props>(
  ({ onSubmitSuccess }, ref) => {
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const snapPoints = useMemo(() => ['62%'], []);

    const handleSheetChange = useCallback((index: number) => {
      if (index === -1) {
        setSelectedMood(null);
        setContent('');
        setError(null);
        setSubmitting(false);
      }
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.6}
          style={[props.style, { backgroundColor: '#050410' }]}
        />
      ),
      [],
    );

    const handleSubmit = async () => {
      if (!selectedMood || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        await api.post<CreateJournalNoteResponse>('/journal', {
          mood: selectedMood,
          content,
        });
        const entries = await api.get<BackendEntry[]>('/entries/current');
        onSubmitSuccess(Array.isArray(entries) ? entries : []);
        (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        onChange={handleSheetChange}
      >
        <View style={styles.content}>
          <Text style={styles.title}>How are you feeling?</Text>
          <Text style={styles.subtitle}>Choose a mood, then write your thought</Text>

          <Text style={styles.label}>MOOD</Text>
          <View style={styles.moodRow}>
            {MOODS.map(({ mood, label }) => (
              <MoodCircle
                key={mood}
                mood={mood}
                label={label}
                selected={selectedMood === mood}
                onPress={() => setSelectedMood(mood)}
              />
            ))}
          </View>

          <Text style={styles.label}>
            THOUGHT <Text style={styles.labelOptional}>(optional)</Text>
          </Text>
          <BottomSheetTextInput
            style={styles.input}
            placeholder="Write your thought..."
            placeholderTextColor="rgba(171,129,205,0.45)"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={3}
          />

          {error !== null && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.submitBtn, (!selectedMood || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selectedMood || submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? 'Adding...' : '✦ Add the star'}
            </Text>
          </Pressable>
        </View>
      </BottomSheetModal>
    );
  },
);

JournalSheet.displayName = 'JournalSheet';

function MoodCircle({
  mood,
  label,
  selected,
  onPress,
}: {
  mood: Mood;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.15, { damping: 10, stiffness: 200 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });
    onPress();
  };

  return (
    <Pressable style={styles.moodItem} onPress={handlePress}>
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: MoodColors[mood] },
          selected && styles.circleSelected,
          animStyle,
        ]}
      />
      <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#1a1438',
    borderRadius: 24,
  },
  handle: {
    backgroundColor: Palette.mauve,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Palette.brightLavender,
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.brightLavender,
    letterSpacing: 1,
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
  },
  labelOptional: {
    fontWeight: '400',
    letterSpacing: 0,
    textTransform: 'none',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  moodItem: {
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  circleSelected: {
    borderColor: '#ffffff',
  },
  moodLabel: {
    fontSize: 9,
    color: Palette.brightLavender,
    fontWeight: '600',
  },
  moodLabelSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(87,74,226,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.3)',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.three,
  },
  error: {
    fontSize: 13,
    color: '#D85A30',
    marginBottom: Spacing.two,
  },
  submitBtn: {
    backgroundColor: Palette.majorelleBlue,
    borderRadius: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/journal-sheet.tsx
git commit -m "feat: add JournalSheet bottom sheet component"
```

---

### Task 4: Update dashboard to use JournalSheet

**Files:**
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Replace the full content of `src/app/dashboard.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { ConstellationCanvas, type Entry } from '@/components/constellation-canvas';
import { JournalSheet } from '@/components/journal-sheet';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { AstronautLanding } from '@/components/astronaut-landing';
import { Palette, Spacing, type Mood } from '@/constants/theme';
import { api, getStoredSeed } from '@/lib/api';
import type { BackendEntry } from '@/lib/types';
import {
  constellationIdForEntry,
  generateConstellationShape,
  getConstellationCenter,
  slotForEntry,
  starScreenPosition,
  type Point,
  type View as GalaxyView,
} from '@/lib/galaxyPositioning';

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getGreeting(displayName: string | null): string {
  const hour = new Date().getHours();
  let salutation: string;
  if (hour >= 5 && hour < 12) salutation = 'Good morning';
  else if (hour >= 12 && hour < 18) salutation = 'Good afternoon';
  else if (hour >= 18 && hour < 22) salutation = 'Good evening';
  else salutation = 'Good night';
  return displayName ? `${salutation}, ${displayName}` : salutation;
}

type AccountDto = {
  id: string;
  email: string;
  displayName: string;
  isNotification: boolean;
};

const FALLBACK_SEED = 42;
const START_YEAR = 2026;
const MAX_SLOTS = 7;
const SLOT_RADIUS = 120;

const DEV_MOCK_ENTRIES: Entry[] = [
  { entryIndex: 0, date: '2026-01-03', mood: 'JOYFUL' },
  { entryIndex: 1, date: '2026-01-07', mood: 'CALM' },
  { entryIndex: 2, date: '2026-01-12', mood: 'NEUTRAL' },
  { entryIndex: 3, date: '2026-01-18', mood: 'SAD' },
];

function toEntries(data: BackendEntry[]): Entry[] {
  return data.map((item, i) => ({
    entryIndex: item.entryIndex ?? i,
    date: item.entryDate,
    mood: (item.mood as Mood) || 'NEUTRAL',
  }));
}

export default function DashboardScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(FALLBACK_SEED);
  const [entries, setEntries] = useState<Entry[]>(__DEV__ ? DEV_MOCK_ENTRIES : []);
  const [startYear, setStartYear] = useState(START_YEAR);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);

    api.get<BackendEntry[]>('/entries/current')
      .then((data) => {
        if (!Array.isArray(data)) return;
        setEntries(toEntries(data));
        if (data.length > 0) setStartYear(new Date(data[0].entryDate).getUTCFullYear());
      })
      .catch(console.error);

    api.get<AccountDto>('/accounts')
      .then((data) => setDisplayName(data.displayName ?? null))
      .catch(console.error);
  }, []);

  const handleSubmitSuccess = (data: BackendEntry[]) => {
    setEntries(toEntries(data));
    if (data.length > 0) setStartYear(new Date(data[0].entryDate).getUTCFullYear());
  };

  const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  const cId = sorted.length > 0 ? constellationIdForEntry(sorted[0].entryIndex) : 'c0';
  const centerDate = sorted.length > 0 ? sorted[0].date : new Date().toISOString().slice(0, 10);
  const view: GalaxyView = { centerX: width / 2, centerY: height / 2, zoom: 1 };
  const center = getConstellationCenter(centerDate, startYear);
  const shape = generateConstellationShape(seed, cId);
  const allPositions: Point[] = shape.map((p) => starScreenPosition(center, p, view, SLOT_RADIUS));
  const filledSlots = new Set(sorted.map((e) => slotForEntry(e.entryIndex)));
  const nextSlot = Array.from({ length: MAX_SLOTS }, (_, i) => i).find((i) => !filledSlots.has(i));
  const mascotPos: Point | null = nextSlot !== undefined ? allPositions[nextSlot] : null;

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

      <View
        style={[styles.hud, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="none">
          <View>
            <Text style={styles.dateText}>{getFormattedDate()}</Text>
            <Text style={styles.greetingText}>{getGreeting(displayName)}</Text>
          </View>
          <Text style={styles.progressText}>
            {entries.length >= MAX_SLOTS ? 'Constellation complete ✦' : `${entries.length} / ${MAX_SLOTS} ★`}
          </Text>
        </View>

        {mascotPos && (
          <View
            style={{ position: 'absolute', left: mascotPos.x - 30, top: mascotPos.y - 52 }}
            pointerEvents="none"
          >
            <AstronautLanding width={60} height={52} />
          </View>
        )}

        <View style={styles.bottomArea} pointerEvents="box-none">
          <Pressable
            style={styles.addBtn}
            onPress={() => bottomSheetRef.current?.present()}>
            <Text style={styles.addBtnText}>+ How are you feeling</Text>
          </Pressable>
          <View style={styles.bottomNav}>
            <Pressable style={styles.navItem}>
              <Text style={[styles.navIcon, { color: Palette.mauve }]}>⌂</Text>
            </Pressable>
            <Pressable style={styles.navItem}>
              <Text style={[styles.navIcon, { color: Palette.brightLavender }]}>◎</Text>
            </Pressable>
            <Pressable style={styles.navItem}>
              <Text style={[styles.navIcon, { color: Palette.brightLavender }]}>◉</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <JournalSheet ref={bottomSheetRef} onSubmitSuccess={handleSubmitSuccess} />
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
    alignItems: 'stretch',
    paddingHorizontal: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.brightLavender,
    letterSpacing: 0.3,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.mauve,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  bottomArea: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  addBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 32,
    backgroundColor: 'rgba(87, 74, 226, 0.85)',
    borderWidth: 1,
    borderColor: Palette.brightLavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  navItem: {
    padding: Spacing.two,
  },
  navIcon: {
    fontSize: 22,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run the app and manually verify the full flow**

```bash
npx expo start
```

Verify:
1. Dashboard loads, "How are you feeling" button visible
2. Tapping button opens the bottom sheet — galaxy darkens behind it
3. All 6 mood circles visible with correct colors
4. Tapping a circle selects it (white border, scale bump)
5. Text input accepts input, keyboard doesn't cover the input (BottomSheetTextInput handles this)
6. "Add the star" is dimmed until a mood is selected
7. Submitting calls POST /journal + GET /entries/current
8. Sheet dismisses on success; new star animates into the constellation
9. Swiping down dismisses the sheet; state resets (mood deselected) when re-opened
10. On API error: error message appears inside the sheet, sheet stays open

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard.tsx
git commit -m "feat: replace MoodPicker popup with JournalSheet bottom sheet"
```
