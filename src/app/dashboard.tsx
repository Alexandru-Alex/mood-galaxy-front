import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConstellationCanvas, type Entry } from '@/components/constellation-canvas';
import { MoodPicker, type Mood } from '@/components/mood-picker';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { Palette, Spacing } from '@/constants/theme';
import { api, getStoredSeed } from '@/lib/api';

const FALLBACK_SEED = 42;
const START_YEAR = 2026;

const MOCK_ENTRIES: Entry[] = [
  { entryIndex: 0, date: '2026-01-03', mood: 'JOYFUL' },
  { entryIndex: 1, date: '2026-01-07', mood: 'CALM' },
  { entryIndex: 2, date: '2026-01-12', mood: 'NEUTRAL' },
  { entryIndex: 3, date: '2026-01-18', mood: 'SAD' },
];

export default function DashboardScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(FALLBACK_SEED);
  const [entries, setEntries] = useState<Entry[]>(MOCK_ENTRIES);
  const [startYear, setStartYear] = useState(START_YEAR);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);

    api.get<{ entries: Entry[]; startYear: number }>('/entries/current')
      .then((data) => {
        setEntries(data.entries);
        setStartYear(data.startYear);
      })
      .catch(console.error);
  }, []);

  const handleMoodSelect = async (mood: Mood) => {
    setPickerVisible(false);
    setSubmitting(true);
    try {
      await api.post('/entries', { mood });
      const data = await api.get<{ entries: Entry[]; startYear: number }>('/entries/current');
      setEntries(data.entries);
      setStartYear(data.startYear);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const canAdd = entries.length < 7 && !submitting;

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

      {pickerVisible && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setPickerVisible(false)}
        />
      )}

      <View
        style={[styles.hud, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        pointerEvents="box-none">
        <View style={styles.hudTop} pointerEvents="none">
          <Text style={styles.counter}>{entries.length} / 7</Text>
          <Text style={styles.hint}>
            {entries.length >= 7 ? 'Constellation complete ✦' : 'Add your mood for today'}
          </Text>
        </View>

        <View style={styles.bottomArea} pointerEvents="box-none">
          <MoodPicker visible={pickerVisible} onSelect={handleMoodSelect} />
          {canAdd && (
            <Pressable
              style={styles.addBtn}
              onPress={() => setPickerVisible((v) => !v)}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          )}
        </View>
      </View>
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
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  hudTop: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  counter: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.mauve,
    letterSpacing: 1,
  },
  hint: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.brightLavender,
    letterSpacing: 0.3,
  },
  bottomArea: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(87, 74, 226, 0.85)',
    borderWidth: 1,
    borderColor: Palette.brightLavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
  },
});
