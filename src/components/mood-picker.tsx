import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Palette, Spacing, type Mood } from '@/constants/theme';

export type { Mood };

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
