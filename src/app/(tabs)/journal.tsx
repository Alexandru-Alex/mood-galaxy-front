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

export default function JurnalScreen() {
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
