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
  const [loading, setLoading] = useState(true);
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;
  const sheetAnim = useRef(new RNAnimated.Value(400)).current;

  const visible = date !== null;

  useEffect(() => {
    if (!visible) return;
    backdropAnim.stopAnimation();
    sheetAnim.stopAnimation();
    backdropAnim.setValue(0);
    sheetAnim.setValue(400);
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
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <RNAnimated.View style={[styles.backdrop, { opacity: backdropAnim }]} pointerEvents="none" />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />
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
  const time = new Date(note.createdAt).toLocaleTimeString('en-US', {
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
