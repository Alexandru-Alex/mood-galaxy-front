# Day Notes Sheet & Journal Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap a filled star on the dashboard to see all notes from that day; add a Journal tab with full history grouped by day.

**Architecture:** `DayNotesSheet` is a reusable bottom sheet used from both dashboard (star tap) and journal screen (history tap). Stars become tappable by threading an optional `onStarPress(date)` prop through `ConstellationCanvas → ConstellationGroup → FilledStar`. The Journal tab calls a new `GET /entries` backend endpoint to load all history.

**Tech Stack:** React Native, Expo Router, react-native-reanimated (existing), RNAnimated (existing), TypeScript

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/lib/types.ts` | Add `JournalNoteResponse` type |
| Modify | `src/lib/entries.ts` | Add `fetchEntriesByDate`, `fetchAllEntries` |
| Modify | `src/components/constellation-group.tsx` | `FilledStar` gets `onPress`; `ConstellationGroup` gets `onStarPress` + `slotDateMap` |
| Modify | `src/components/constellation-canvas.tsx` | Add `onStarPress` prop, conditional `pointerEvents` |
| Create | `src/components/day-notes-sheet.tsx` | Reusable bottom sheet showing notes for a date |
| Modify | `src/app/dashboard.tsx` | Add `selectedDate` state, wire `onStarPress`, render `DayNotesSheet` |
| Create | `src/app/journal.tsx` | Journal history screen |
| Modify | `src/app/dashboard.tsx` | Wire third nav button to Journal screen |

---

### Task 1: Data layer — types and API functions

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/entries.ts`

- [ ] **Step 1: Add `JournalNoteResponse` to `src/lib/types.ts`**

  The file currently has no imports. Add the `Mood` import and the new type:

  ```typescript
  import type { Mood } from '@/constants/theme';

  /** Entry shape returned by GET /entries/current (List<JournalEntryResponse>). */
  export type BackendEntry = {
    entryDate: string;
    mood: string;
    entryIndex?: number;
  };

  /** Response body from POST /journal. */
  export type CreateJournalNoteResponse = {
    id: string;
    createdAt: string;
  };

  /** Response body from GET /entries/{date} and GET /entries. */
  export type JournalNoteResponse = {
    id: string;
    mood: Mood;
    content: string | null;
    createdAt: string;
  };
  ```

- [ ] **Step 2: Add fetch functions to `src/lib/entries.ts`**

  Add the `api` import and `JournalNoteResponse` import at the top of the file (merge with existing imports):

  ```typescript
  import type { Mood } from '@/constants/theme';
  import type { BackendEntry, JournalNoteResponse } from '@/lib/types';
  import { api } from '@/lib/api';
  ```

  Add at the bottom of the file:

  ```typescript
  export async function fetchEntriesByDate(date: string): Promise<JournalNoteResponse[]> {
    const data = await api.get<JournalNoteResponse[]>(`/entries/${date}`);
    return Array.isArray(data) ? data : [];
  }

  export async function fetchAllEntries(): Promise<JournalNoteResponse[]> {
    const data = await api.get<JournalNoteResponse[]>('/entries');
    return Array.isArray(data) ? data : [];
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/types.ts src/lib/entries.ts
  git commit -m "feat: add JournalNoteResponse type and fetch functions"
  ```

---

### Task 2: Make `FilledStar` and `ConstellationGroup` tappable

**Files:**
- Modify: `src/components/constellation-group.tsx`

- [ ] **Step 1: Add `Pressable` to imports (line 2)**

  Change:
  ```typescript
  import { StyleSheet, View } from 'react-native';
  ```
  to:
  ```typescript
  import { Pressable, StyleSheet, View } from 'react-native';
  ```

- [ ] **Step 2: Replace the `FilledStar` function (lines 35–57)**

  ```typescript
  function FilledStar({ x, y, mood, onPress }: Point & { mood: Mood; onPress?: () => void }) {
    const color = MoodColors[mood];
    const scale = useSharedValue(0.2);
    const opacity = useSharedValue(0);

    useEffect(() => {
      scale.value = withSpring(1, { damping: 8, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 250 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable
        style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }]}
        onPress={onPress}
        hitSlop={12}
      >
        <Animated.View style={[styles.starContent, animStyle]}>
          <View style={[styles.halo, { backgroundColor: color }]} />
          <View style={[styles.core, { backgroundColor: color }]} />
        </Animated.View>
      </Pressable>
    );
  }
  ```

- [ ] **Step 3: Add `starContent` to the StyleSheet at the bottom**

  Inside `StyleSheet.create({...})`, add after `starWrap`:

  ```typescript
  starContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ```

- [ ] **Step 4: Add `onStarPress` to `ConstellationGroup` Props type (lines 113–121)**

  ```typescript
  type Props = {
    seed: number;
    constellationId: string;
    entries: Entry[];
    startYear: number;
    view: GalaxyView;
    scale: SharedValue<number>;
    centerOverride?: { angle: number; radius: number };
    onStarPress?: (date: string) => void;
  };
  ```

- [ ] **Step 5: Destructure `onStarPress` and build `slotDateMap`**

  Update the `ConstellationGroup` function signature to include `onStarPress`:

  ```typescript
  export function ConstellationGroup({
    seed,
    constellationId,
    entries,
    startYear,
    view,
    scale,
    centerOverride,
    onStarPress,
  }: Props) {
  ```

  After line 143 (`const slotMoodMap = ...`), add:

  ```typescript
  const slotDateMap = new Map(sorted.map((e) => [slotForEntry(e.entryIndex), e.date]));
  ```

- [ ] **Step 6: Make root `View` (line 178) conditional on `onStarPress`**

  Change:
  ```typescript
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
  ```
  to:
  ```typescript
  <View style={StyleSheet.absoluteFill} pointerEvents={onStarPress ? 'box-none' : 'none'}>
  ```

- [ ] **Step 7: Make inner `Animated.View` (line 204) conditional on `onStarPress`**

  Change:
  ```typescript
  <Animated.View style={[StyleSheet.absoluteFill, fullStyle]} pointerEvents="none">
  ```
  to:
  ```typescript
  <Animated.View style={[StyleSheet.absoluteFill, fullStyle]} pointerEvents={onStarPress ? 'box-none' : 'none'}>
  ```

- [ ] **Step 8: Pass `onPress` to each `FilledStar` (lines 247–251)**

  Replace:
  ```typescript
  {allPositions.map((p, i) =>
    filledSlots.has(i) ? (
      <FilledStar key={`f-${i}`} x={p.x} y={p.y} mood={slotMoodMap.get(i) ?? 'NEUTRAL'} />
    ) : null,
  )}
  ```
  with:
  ```typescript
  {allPositions.map((p, i) =>
    filledSlots.has(i) ? (
      <FilledStar
        key={`f-${i}`}
        x={p.x}
        y={p.y}
        mood={slotMoodMap.get(i) ?? 'NEUTRAL'}
        onPress={onStarPress ? () => onStarPress(slotDateMap.get(i) ?? '') : undefined}
      />
    ) : null,
  )}
  ```

- [ ] **Step 9: Commit**

  ```bash
  git add src/components/constellation-group.tsx
  git commit -m "feat: make FilledStar tappable with optional onPress"
  ```

---

### Task 3: Thread `onStarPress` through `ConstellationCanvas`

**Files:**
- Modify: `src/components/constellation-canvas.tsx`

- [ ] **Step 1: Rewrite `constellation-canvas.tsx`**

  The file is short — replace it entirely:

  ```typescript
  import { StyleSheet, View } from 'react-native';
  import { useSharedValue } from 'react-native-reanimated';

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
    onStarPress?: (date: string) => void;
  };

  export function ConstellationCanvas({ seed, entries, startYear, width, height, onStarPress }: Props) {
    const view = { centerX: width / 2, centerY: height / 2, zoom: 1 };
    const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
    const lastEntry = sorted[sorted.length - 1];
    const currentCId = lastEntry ? constellationIdForEntry(lastEntry.entryIndex) : 'c0';
    const currentEntries = sorted.filter((e) => constellationIdForEntry(e.entryIndex) === currentCId);
    const scale = useSharedValue(1);

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents={onStarPress ? 'box-none' : 'none'}>
        <ConstellationGroup
          seed={seed}
          constellationId={currentCId}
          entries={currentEntries}
          startYear={startYear}
          view={view}
          scale={scale}
          onStarPress={onStarPress}
        />
      </View>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/constellation-canvas.tsx
  git commit -m "feat: thread onStarPress through ConstellationCanvas"
  ```

---

### Task 4: Create `DayNotesSheet` component

**Files:**
- Create: `src/components/day-notes-sheet.tsx`

- [ ] **Step 1: Create the file**

  ```typescript
  import { useCallback, useEffect, useRef, useState } from 'react';
  import {
    ActivityIndicator,
    Animated as RNAnimated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
  } from 'react-native';
  import { MoodColors, Palette, Spacing } from '@/constants/theme';
  import { fetchEntriesByDate } from '@/lib/entries';
  import type { JournalNoteResponse } from '@/lib/types';

  type Props = {
    date: string | null;
    onClose: () => void;
  };

  export function DayNotesSheet({ date, onClose }: Props) {
    const [notes, setNotes] = useState<JournalNoteResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;
    const sheetAnim = useRef(new RNAnimated.Value(400)).current;

    const visible = date !== null;

    useEffect(() => {
      if (!visible) return;
      setLoading(true);
      setNotes([]);
      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      ]).start();
      fetchEntriesByDate(date!)
        .then((data) => {
          setNotes([...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const close = useCallback(() => {
      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        RNAnimated.timing(sheetAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        backdropAnim.setValue(0);
        sheetAnim.setValue(400);
        onClose();
      });
    }, [backdropAnim, sheetAnim, onClose]);

    const formattedDate = date
      ? new Date(date + 'T00:00:00').toLocaleDateString('ro-RO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
        <RNAnimated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </RNAnimated.View>
        <RNAnimated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={styles.handle} />
          <Text style={styles.dateHeader}>{formattedDate}</Text>
          {loading ? (
            <ActivityIndicator color={Palette.brightLavender} style={styles.spinner} />
          ) : notes.length === 0 ? (
            <Text style={styles.emptyText}>Nicio notă pentru această zi</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent}>
              {notes.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
            </ScrollView>
          )}
        </RNAnimated.View>
      </Modal>
    );
  }

  function NoteItem({ note }: { note: JournalNoteResponse }) {
    const color = MoodColors[note.mood];
    const time = new Date(note.createdAt).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const moodLabel = note.mood.charAt(0) + note.mood.slice(1).toLowerCase();

    return (
      <View style={styles.noteItem}>
        <View style={[styles.moodCircle, { backgroundColor: color }]} />
        <View style={styles.noteContent}>
          <Text style={styles.metaText}>{moodLabel} · {time}</Text>
          {note.content ? <Text style={styles.contentText}>{note.content}</Text> : null}
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#12102A',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: Palette.brightLavender,
      opacity: 0.4,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    dateHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      paddingHorizontal: Spacing.four,
      paddingVertical: 12,
      textTransform: 'capitalize',
    },
    spinner: {
      marginTop: 32,
    },
    emptyText: {
      color: Palette.brightLavender,
      opacity: 0.6,
      textAlign: 'center',
      marginTop: 32,
      fontSize: 14,
    },
    listContent: {
      paddingHorizontal: Spacing.four,
      paddingBottom: 8,
    },
    noteItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      gap: 12,
    },
    moodCircle: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 3,
    },
    noteContent: {
      flex: 1,
    },
    metaText: {
      fontSize: 13,
      fontWeight: '600',
      color: Palette.brightLavender,
    },
    contentText: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
      lineHeight: 20,
    },
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/day-notes-sheet.tsx
  git commit -m "feat: add DayNotesSheet component"
  ```

---

### Task 5: Wire `DayNotesSheet` into `dashboard.tsx`

**Files:**
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Add `DayNotesSheet` import**

  After the existing imports, add:
  ```typescript
  import { DayNotesSheet } from '@/components/day-notes-sheet';
  ```

- [ ] **Step 2: Add `selectedDate` state**

  After line 76 (`const bottomSheetRef = ...`), add:
  ```typescript
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  ```

- [ ] **Step 3: Add `onStarPress` to `ConstellationCanvas` (lines 119–125)**

  ```typescript
  <ConstellationCanvas
    seed={seed}
    entries={entries}
    startYear={startYear}
    width={width}
    height={height}
    onStarPress={setSelectedDate}
  />
  ```

- [ ] **Step 4: Render `DayNotesSheet` after `JournalSheet` (line 169)**

  ```typescript
  <JournalSheet ref={bottomSheetRef} onSubmitSuccess={handleSubmitSuccess} />
  <DayNotesSheet date={selectedDate} onClose={() => setSelectedDate(null)} />
  ```

- [ ] **Step 5: Verify manually**

  Run the app. Tap a filled star (colored dot) on the dashboard. The sheet should slide up showing the date. In dev with mock entries, the fetch will hit the real backend — if no backend is running, it will show the empty state. Confirm the sheet dismisses when tapping the backdrop.

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/dashboard.tsx
  git commit -m "feat: wire DayNotesSheet to dashboard star tap"
  ```

---

### Task 6: Create Journal screen and wire nav button

**Files:**
- Create: `src/app/journal.tsx`
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Create `src/app/journal.tsx`**

  ```typescript
  import { useEffect, useState } from 'react';
  import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
  } from 'react-native';
  import { StatusBar } from 'expo-status-bar';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import { useRouter } from 'expo-router';
  import { MoodColors, Palette, Spacing } from '@/constants/theme';
  import { fetchAllEntries } from '@/lib/entries';
  import { DayNotesSheet } from '@/components/day-notes-sheet';
  import { SpaceBackground } from '@/components/space-background';
  import type { JournalNoteResponse } from '@/lib/types';

  type DayGroup = { date: string; notes: JournalNoteResponse[] };

  export default function JournalScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [groups, setGroups] = useState<DayGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
      fetchAllEntries()
        .then((data) => {
          const map = new Map<string, JournalNoteResponse[]>();
          for (const note of data) {
            const date = note.createdAt.slice(0, 10);
            if (!map.has(date)) map.set(date, []);
            map.get(date)!.push(note);
          }
          for (const notes of map.values()) {
            notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          }
          const sorted = [...map.entries()]
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, notes]) => ({ date, notes }));
          setGroups(sorted);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, []);

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <SpaceBackground />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backBtn}>←</Text>
          </Pressable>
          <Text style={styles.title}>Journal</Text>
          <View style={styles.headerSpacer} />
        </View>
        {loading ? (
          <ActivityIndicator color={Palette.brightLavender} style={styles.spinner} />
        ) : groups.length === 0 ? (
          <Text style={styles.emptyText}>No entries yet</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {groups.map(({ date, notes }) => (
              <View key={date} style={styles.group}>
                <Text style={styles.groupHeader}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('ro-RO', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                {notes.map((note) => (
                  <Pressable
                    key={note.id}
                    style={styles.noteItem}
                    onPress={() => setSelectedDate(date)}
                  >
                    <View style={[styles.moodCircle, { backgroundColor: MoodColors[note.mood] }]} />
                    <View style={styles.noteContent}>
                      <Text style={styles.metaText}>
                        {note.mood.charAt(0) + note.mood.slice(1).toLowerCase()} ·{' '}
                        {new Date(note.createdAt).toLocaleTimeString('ro-RO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {note.content ? (
                        <Text style={styles.contentText} numberOfLines={2}>
                          {note.content}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
        <DayNotesSheet date={selectedDate} onClose={() => setSelectedDate(null)} />
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#050410',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.four,
      paddingVertical: 12,
    },
    backBtn: {
      fontSize: 22,
      color: Palette.brightLavender,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      color: '#ffffff',
      textAlign: 'center',
    },
    headerSpacer: {
      width: 22,
    },
    spinner: {
      marginTop: 64,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 64,
      color: Palette.brightLavender,
      opacity: 0.6,
      fontSize: 14,
    },
    listContent: {
      paddingHorizontal: Spacing.four,
      paddingBottom: 40,
    },
    group: {
      marginBottom: 24,
    },
    groupHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: Palette.brightLavender,
      letterSpacing: 0.4,
      textTransform: 'capitalize',
      marginBottom: 8,
    },
    noteItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      gap: 12,
    },
    moodCircle: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 3,
    },
    noteContent: {
      flex: 1,
    },
    metaText: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.7)',
    },
    contentText: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.55)',
      marginTop: 3,
      lineHeight: 19,
    },
  });
  ```

- [ ] **Step 2: Wire the third nav button in `dashboard.tsx` to Journal (line 162)**

  Find:
  ```typescript
  <Pressable style={styles.navItem}>
    <Text style={[styles.navIcon, { color: Palette.brightLavender }]}>◉</Text>
  </Pressable>
  ```
  Replace with:
  ```typescript
  <Pressable style={styles.navItem} onPress={() => router.push('/journal')}>
    <Text style={[styles.navIcon, { color: Palette.brightLavender }]}>◉</Text>
  </Pressable>
  ```

- [ ] **Step 3: Verify manually**

  Run the app. Tap the ◉ button in the bottom nav. The Journal screen should open with a back button and either a spinner or grouped list (once `GET /entries` backend endpoint is available). Back button should return to dashboard.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/journal.tsx src/app/dashboard.tsx
  git commit -m "feat: add Journal screen and wire bottom nav button"
  ```
