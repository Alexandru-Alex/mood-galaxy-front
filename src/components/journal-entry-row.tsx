import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Mood, MoodColors, Spacing } from '@/constants/theme';
import type { JournalNoteResponse } from '@/lib/types';

const MOOD_EMOJI: Record<Mood, string> = {
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
