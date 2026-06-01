import { useEffect, useRef, useState } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConstellationCanvas } from '@/components/constellation-canvas';
import { toEntries, type Entry } from '@/lib/entries';
import { JournalSheet, type JournalSheetHandle } from '@/components/journal-sheet';
import { DayNotesSheet } from '@/components/day-notes-sheet';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { AstronautConstellation } from '@/components/astronaut-constellation';
import { Palette, Spacing } from '@/constants/theme';
import { api, getStoredSeed } from '@/lib/api';
import type { BackendEntry } from '@/lib/types';
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


function AstronautBanner({ message }: { message: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={offlineStyles.container} pointerEvents="none">
      <Animated.View style={[floatStyle, offlineStyles.inner]}>
        <View style={offlineStyles.bubble}>
          <Text style={offlineStyles.bubbleText}>{message}</Text>
          <View style={offlineStyles.bubbleTail} />
        </View>
        <Image
          source={require('@/assets/images/astronaut-standby.png')}
          style={offlineStyles.image}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const offlineStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
  },
  image: {
    width: 130,
    height: 130,
  },
  bubble: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 220,
    position: 'relative',
  },
  bubbleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1c1a3a',
    textAlign: 'center',
    lineHeight: 18,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
});

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(FALLBACK_SEED);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const bottomSheetRef = useRef<JournalSheetHandle>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data: backendEntries = [], isError: fetchError } = useQuery({
    queryKey: ['entries', 'current'],
    queryFn: () => api.get<BackendEntry[]>('/entries/current'),
  });

  const entries: Entry[] = toEntries(backendEntries);
  const startYear = backendEntries.length > 0
    ? new Date(backendEntries[0].entryDate).getUTCFullYear()
    : START_YEAR;

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);

    api.get<AccountDto>('/accounts')
      .then((data) => setDisplayName(data.displayName ?? null))
      .catch(console.error);
  }, []);

  const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  const lastEntry = sorted[sorted.length - 1];
  const currentCId = lastEntry ? constellationIdForEntry(lastEntry.entryIndex) : 'c0';
  const currentEntries = sorted.filter((e) => constellationIdForEntry(e.entryIndex) === currentCId);
  const centerDate = currentEntries.length > 0 ? currentEntries[0].date : new Date().toISOString().slice(0, 10);
  const view: GalaxyView = { centerX: width / 2, centerY: height / 2, zoom: 1 };
  const center = getConstellationCenter(centerDate, startYear);
  const shape = generateConstellationShape(seed, currentCId);
  const allPositions: Point[] = shape.map((p) => starScreenPosition(center, p, view, SLOT_RADIUS));
  const filledSlots = new Set(currentEntries.map((e) => slotForEntry(e.entryIndex)));
  const nextSlot = Array.from({ length: MAX_SLOTS }, (_, i) => i).find((i) => !filledSlots.has(i));
  const mascotPos: Point | null = nextSlot !== undefined ? allPositions[nextSlot] : null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      {entries.length > 0 && (
        <ConstellationCanvas
          seed={seed}
          entries={entries}
          startYear={startYear}
          width={width}
          height={height}
          onStarPress={setSelectedDate}
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
            {currentEntries.length >= MAX_SLOTS ? 'Constellation complete ✦' : `${currentEntries.length} / ${MAX_SLOTS} ★`}
          </Text>
        </View>

        {mascotPos && entries.length > 0 && !fetchError && (
          <View
            style={{ position: 'absolute', left: mascotPos.x - 30, top: mascotPos.y - 52 }}
            pointerEvents="none"
          >
            <AstronautConstellation width={60} height={60} />
          </View>
        )}

        {fetchError && (
          <AstronautBanner message={"Houston, we have a problem...\nCan't reach the galaxy right now!"} />
        )}
        {!fetchError && entries.length === 0 && (
          <AstronautBanner message={"Your galaxy is empty.\nAdd your first star!"} />
        )}

        <View style={styles.bottomArea} pointerEvents="box-none">
          <Pressable
            style={styles.addBtn}
            onPress={() => bottomSheetRef.current?.present()}>
            <Text style={styles.addBtnText}>+ How are you feeling</Text>
          </Pressable>
        </View>
      </View>

      <JournalSheet ref={bottomSheetRef} />
      <DayNotesSheet date={selectedDate} onClose={() => setSelectedDate(null)} />
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
    gap: 8,
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
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mauve,
    letterSpacing: 0.3,
    textAlign: 'right',
    flexShrink: 1,
  },
  bottomArea: {
    alignItems: 'center',
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
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
