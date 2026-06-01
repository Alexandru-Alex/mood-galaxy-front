import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { useQueryClient } from '@tanstack/react-query';
import { MoodColors, Palette, Spacing, type Mood } from '@/constants/theme';
import { api } from '@/lib/api';
import type { CreateJournalNoteResponse } from '@/lib/types';

const MOODS: { mood: Mood; label: string }[] = [
  { mood: 'JOYFUL', label: 'Joyful' },
  { mood: 'CALM', label: 'Calm' },
  { mood: 'NEUTRAL', label: 'Neutral' },
  { mood: 'ANXIOUS', label: 'Anxious' },
  { mood: 'SAD', label: 'Sad' },
  { mood: 'ANGRY', label: 'Angry' },
];

type Props = Record<string, never>;

export type JournalSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

const SHEET_HEIGHT = Dimensions.get('window').height * 0.65;

export const JournalSheet = forwardRef<JournalSheetHandle, Props>(
  (_props, ref) => {
    const [visible, setVisible] = useState(false);
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;
    const sheetAnim = useRef(new RNAnimated.Value(SHEET_HEIGHT)).current;

    const resetState = useCallback(() => {
      setSelectedMood(null);
      setContent('');
      setError(null);
      setSubmitting(false);
    }, []);

    useEffect(() => {
      if (!visible) return;
      backdropAnim.setValue(0);
      sheetAnim.setValue(SHEET_HEIGHT);
      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        RNAnimated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }),
      ]).start();
    }, [visible, backdropAnim, sheetAnim]);

    const close = useCallback((onComplete?: () => void) => {
      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(sheetAnim, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setVisible(false);
        onComplete?.();
      });
    }, [backdropAnim, sheetAnim]);

    useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
      dismiss: () => close(() => resetState()),
    }), [close, resetState]);

    const handleSubmit = useCallback(async () => {
      if (!selectedMood || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        await api.post<CreateJournalNoteResponse>('/journal', {
          mood: selectedMood,
          content: content.trim(),
        });
        await queryClient.invalidateQueries({ queryKey: ['entries', 'current'] });
        await queryClient.invalidateQueries({ queryKey: ['notes'] });
        close(() => resetState());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setSubmitting(false);
      }
    }, [selectedMood, submitting, content, queryClient, close, resetState]);

    return (
      <Modal
        visible={visible}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={() => close(() => resetState())}
      >
        <RNAnimated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(() => resetState())} />
          <RNAnimated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={styles.handle} />
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
              <TextInput
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
            </ScrollView>
          </RNAnimated.View>
        </RNAnimated.View>
      </Modal>
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
    scale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 200 }),
      withSpring(1,    { damping: 10, stiffness: 200 }),
    );
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,4,16,0.6)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#1a1438', // deep space sheet surface
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Palette.mauve,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
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
