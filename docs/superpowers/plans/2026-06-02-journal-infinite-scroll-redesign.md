# Journal Infinite Scroll & Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the journal's single-page flat list with a paginated SectionList, a compact mood-badge row design, and a calendar bottom sheet for jumping to any date.

**Architecture:** `useInfiniteQuery` accumulates pages from `GET /notes?page=N&size=20`; a `SectionList` groups entries by day with relative date headers; a new `JournalCalendarSheet` (Modal + RNAnimated, same pattern as `DayNotesSheet`) lets users jump to any loaded date or view it via `DayNotesSheet` if not yet paginated.

**Tech Stack:** React Native `SectionList`, `@tanstack/react-query` v4 `useInfiniteQuery`, `@expo/vector-icons` Ionicons, `RNAnimated` Modal for calendar sheet.

---

### Task 1: Add `fetchNotesPage` to the entries service

**Files:**
- Modify: `src/lib/entries.ts`

- [ ] **Step 1: Add the paginated fetch function**

Open `src/lib/entries.ts` and append the new function after `fetchAllEntries`. Do not remove `fetchAllEntries` — it is used elsewhere.

```ts
export async function fetchNotesPage(page: number): Promise<PageResponse<JournalNoteResponse>> {
  const data = await api.get<PageResponse<JournalNoteResponse>>(`/notes?page=${page}&size=20`);
  return data;
}
```

Final `src/lib/entries.ts`:

```ts
import type { Mood } from '@/constants/theme';
import type { BackendEntry, JournalNoteResponse, PageResponse } from '@/lib/types';
import { api } from '@/lib/api';

export type Entry = { entryIndex: number; date: string; mood: Mood };

export function toEntries(data: BackendEntry[]): Entry[] {
  const sorted = [...data].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  return sorted.map((item, i) => ({
    entryIndex: item.entryIndex ?? i,
    date: item.entryDate,
    mood: (item.mood as Mood) || 'NEUTRAL',
  }));
}

export async function fetchEntriesByDate(date: string): Promise<JournalNoteResponse[]> {
  if (!date) return [];
  const data = await api.get<JournalNoteResponse[]>(`/entries/${date}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchAllEntries(): Promise<JournalNoteResponse[]> {
  const data = await api.get<PageResponse<JournalNoteResponse>>('/notes');
  if (Array.isArray(data?.content)) return data.content;
  console.warn('[fetchAllEntries] unexpected response shape', data);
  return [];
}

export async function fetchNotesPage(page: number): Promise<PageResponse<JournalNoteResponse>> {
  const data = await api.get<PageResponse<JournalNoteResponse>>(`/notes?page=${page}&size=20`);
  return data;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `entries.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/entries.ts
git commit -m "feat: add fetchNotesPage for paginated journal entries"
```

---

### Task 2: Create `JournalEntryRow` component

**Files:**
- Create: `src/components/journal-entry-row.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MoodColors, Spacing } from '@/constants/theme';
import type { JournalNoteResponse } from '@/lib/types';

const MOOD_EMOJI: Record<string, string> = {
  JOYFUL: '😊',
  CALM: '😌',
  NEUTRAL: '😐',
  ANXIOUS: '😰',
  SAD: '😢',
  ANGRY: '😠',
};

type Props = {
  note: JournalNoteResponse;
  onPress: () => void;
};

export function JournalEntryRow({ note, onPress }: Props) {
  const color = MoodColors[note.mood];
  const emoji = MOOD_EMOJI[note.mood] ?? '●';
  const label = note.mood.charAt(0) + note.mood.slice(1).toLowerCase();
  const time = new Date(note.createdAt).toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: color + '33' }]}>
        <Text style={[styles.badgeText, { color }]}>{emoji} {label}</Text>
      </View>
      {note.content ? (
        <Text style={styles.preview} numberOfLines={1}>{note.content}</Text>
      ) : (
        <Text style={[styles.preview, styles.noContent]}>—</Text>
      )}
      <Text style={styles.time}>{time}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    marginBottom: 4,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  preview: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  noContent: {
    opacity: 0.3,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    flexShrink: 0,
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
git add src/components/journal-entry-row.tsx
git commit -m "feat: add JournalEntryRow compact mood-badge component"
```

---

### Task 3: Create `JournalCalendarSheet` component

**Files:**
- Create: `src/components/journal-calendar-sheet.tsx`

This follows the exact same Modal + RNAnimated pattern as `src/components/day-notes-sheet.tsx`. Read that file before starting if anything is unclear.

- [ ] **Step 1: Create the component**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
  loadedDates: Set<string>;
};

const MONTH_NAMES = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];
const DAY_NAMES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0 Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  return grid;
}

export function JournalCalendarSheet({ visible, onClose, onDateSelect, loadedDates }: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;
  const sheetAnim = useRef(new RNAnimated.Value(400)).current;

  useEffect(() => {
    if (!visible) return;
    backdropAnim.setValue(0);
    sheetAnim.setValue(400);
    RNAnimated.parallel([
      RNAnimated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      RNAnimated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
    ]).start();
  }, [visible]);

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

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayPress = (dateStr: string) => {
    // Dismiss immediately (no animation) so the next action renders cleanly
    backdropAnim.setValue(0);
    sheetAnim.setValue(400);
    onClose();
    onDateSelect(dateStr);
  };

  const today = new Date().toISOString().slice(0, 10);
  const grid = getMonthGrid(viewYear, viewMonth);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <RNAnimated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </RNAnimated.View>
      <RNAnimated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
        <View style={styles.handle} />
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={Palette.brightLavender} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={12}>
            <Ionicons name="chevron-forward" size={20} color={Palette.brightLavender} />
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          {DAY_NAMES.map((d, i) => (
            <Text key={`dn-${i}`} style={styles.dayName}>{d}</Text>
          ))}
          {grid.map((day, i) => {
            if (day === null) return <View key={`empty-${i}`} style={styles.cell} />;
            const mm = String(viewMonth + 1).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            const dateStr = `${viewYear}-${mm}-${dd}`;
            const hasEntry = loadedDates.has(dateStr);
            const isToday = dateStr === today;
            return (
              <TouchableOpacity
                key={dateStr}
                style={[styles.cell, isToday && styles.todayCell]}
                onPress={() => handleDayPress(dateStr)}
              >
                <Text style={[styles.dayNum, isToday && styles.todayNum]}>{day}</Text>
                {hasEntry && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </RNAnimated.View>
    </Modal>
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
    paddingHorizontal: Spacing.four,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.brightLavender,
    opacity: 0.4,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayName: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 8,
  },
  cell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  todayCell: {
    backgroundColor: Palette.majorelleBlue + '33',
    borderRadius: 8,
  },
  dayNum: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  todayNum: {
    color: Palette.brightLavender,
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.brightLavender,
    marginTop: 2,
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
git add src/components/journal-calendar-sheet.tsx
git commit -m "feat: add JournalCalendarSheet monthly calendar bottom sheet"
```

---

### Task 4: Rewrite `journal.tsx` with `useInfiniteQuery` + `SectionList` + calendar

**Files:**
- Modify: `src/app/(tabs)/journal.tsx`

This is a full rewrite. Replace the entire file content.

- [ ] **Step 1: Replace `src/app/(tabs)/journal.tsx`**

```tsx
import { useMemo, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing } from '@/constants/theme';
import { fetchNotesPage } from '@/lib/entries';
import { DayNotesSheet } from '@/components/day-notes-sheet';
import { JournalEntryRow } from '@/components/journal-entry-row';
import { JournalCalendarSheet } from '@/components/journal-calendar-sheet';
import { SpaceBackground } from '@/components/space-background';
import type { JournalNoteResponse } from '@/lib/types';

type DaySection = {
  date: string;
  title: string;
  data: JournalNoteResponse[];
};

function formatSectionTitle(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = yd.toISOString().slice(0, 10);
  if (dateStr === today) return 'Azi';
  if (dateStr === yesterday) return 'Ieri';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
  });
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const sectionListRef = useRef<SectionList<JournalNoteResponse, DaySection>>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['notes'],
      queryFn: ({ pageParam = 0 }) => fetchNotesPage(pageParam as number),
      getNextPageParam: (lastPage) =>
        lastPage.last ? undefined : lastPage.number + 1,
    });

  const sections = useMemo<DaySection[]>(() => {
    const allNotes = data?.pages.flatMap((p) => p.content) ?? [];
    const map = new Map<string, JournalNoteResponse[]>();
    for (const note of allNotes) {
      if (!note?.createdAt) continue;
      const date = note.createdAt.slice(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(note);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, notes]) => ({
        date,
        title: formatSectionTitle(date),
        data: notes,
      }));
  }, [data]);

  const loadedDates = useMemo(
    () => new Set(sections.map((s) => s.date)),
    [sections]
  );

  const handleDateSelect = (date: string) => {
    const sectionIndex = sections.findIndex((s) => s.date === date);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 8,
      });
    } else {
      // Date not yet paginated — open DayNotesSheet directly
      setSelectedDate(date);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <SpaceBackground />
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <TouchableOpacity
          onPress={() => setCalendarVisible(true)}
          hitSlop={12}
        >
          <Ionicons name="calendar-outline" size={22} color={Palette.brightLavender} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Palette.brightLavender} style={styles.spinner} />
      ) : sections.length === 0 ? (
        <Text style={styles.emptyText}>No entries yet</Text>
      ) : (
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, section }) => (
            <JournalEntryRow
              note={item}
              onPress={() => setSelectedDate(section.date)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>
                {section.data.length}{' '}
                {section.data.length === 1 ? 'intrare' : 'intrări'}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                color={Palette.brightLavender}
                style={styles.footer}
              />
            ) : null
          }
          indicatorStyle="white"
        />
      )}

      <DayNotesSheet date={selectedDate} onClose={() => setSelectedDate(null)} />
      <JournalCalendarSheet
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onDateSelect={handleDateSelect}
        loadedDates={loadedDates}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
  footer: {
    marginVertical: 16,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start the app and verify manually**

```bash
npx expo start
```

Check:
- Journal tab shows compact mood-badge rows grouped by day
- Scrolling to the bottom triggers a new fetch (watch network tab or console)
- Calendar icon in header opens the bottom sheet
- Tapping a loaded date closes the sheet and scrolls the list
- Tapping a date not yet in the list opens `DayNotesSheet` for that date
- Adding a new entry (from any other screen) and returning still refreshes the list

- [ ] **Step 4: Commit**

```bash
git add src/app/(tabs)/journal.tsx
git commit -m "feat: rewrite journal screen with infinite scroll, SectionList, and calendar sheet"
```
