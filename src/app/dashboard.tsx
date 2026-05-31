import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConstellationCanvas, type Entry } from '@/components/constellation-canvas';
import { MoodPicker, type Mood } from '@/components/mood-picker';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { AstronautLanding } from '@/components/astronaut-landing';
import { Palette, Spacing } from '@/constants/theme';
import { api, getStoredSeed } from '@/lib/api';
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

export default function DashboardScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(FALLBACK_SEED);
  const [entries, setEntries] = useState<Entry[]>(__DEV__ ? DEV_MOCK_ENTRIES : []);
  const [startYear, setStartYear] = useState(START_YEAR);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

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

    api.get<AccountDto>('/accounts')
      .then((data) => setDisplayName(data.displayName ?? null))
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
      setPickerVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  const canAdd = !submitting;

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

      {pickerVisible && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setPickerVisible(false)}
        />
      )}

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
          <MoodPicker visible={pickerVisible} onSelect={handleMoodSelect} />
          <Pressable
            disabled={!canAdd}
            style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
            onPress={() => setPickerVisible((v) => !v)}>
            <Text style={styles.addBtnText}>+ Cum te simți</Text>
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
  addBtnDisabled: {
    opacity: 0.45,
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
