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
          if (!note?.createdAt) continue;
          const date = note.createdAt.slice(0, 10);
          if (!map.has(date)) map.set(date, []);
          map.get(date)!.push(note);
        }
        for (const notes of map.values()) {
          notes.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
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
