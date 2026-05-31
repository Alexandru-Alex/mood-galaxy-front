// src/app/galaxy.tsx
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polyline } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { Palette } from '@/constants/theme';
import {
  constellationIdForEntry,
  generateConstellationShape,
  getConstellationCenter,
  slotForEntry,
  starScreenPosition,
  type Point,
  type View as GalaxyView,
} from '@/lib/galaxyPositioning';
import { getStoredSeed } from '@/lib/api';

const START_YEAR = 2026;
const SLOT_RADIUS = 120;
const FALLBACK_SEED = 42;

const MOCK_ENTRIES: { date: string }[] = [
  { date: '2026-01-03' },
  { date: '2026-01-07' },
  { date: '2026-01-12' },
  { date: '2026-01-18' },
  { date: '2026-01-24' },
  { date: '2026-02-02' },
  { date: '2026-02-09' },
];

const HALO = 22;
const CORE = 7;

function Star({ x, y }: Point) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }, style]}>
      <View style={styles.halo} />
      <View style={styles.core} />
    </Animated.View>
  );
}

type ConstellationData = {
  id: string;
  stars: Point[];
};

function buildConstellations(seed: number, view: GalaxyView): ConstellationData[] {
  const groups = new Map<string, { firstDate: string; slots: { slot: number; date: string }[] }>();

  MOCK_ENTRIES.forEach((entry, idx) => {
    const cId = constellationIdForEntry(idx);
    const slot = slotForEntry(idx);
    if (!groups.has(cId)) {
      groups.set(cId, { firstDate: entry.date, slots: [] });
    }
    groups.get(cId)!.slots.push({ slot, date: entry.date });
  });

  const result: ConstellationData[] = [];

  groups.forEach((group, cId) => {
    const center = getConstellationCenter(group.firstDate, START_YEAR);
    const shape = generateConstellationShape(seed, cId);

    const stars: Point[] = Array(group.slots.length);
    group.slots.forEach(({ slot }) => {
      stars[slot] = starScreenPosition(center, shape[slot], view, SLOT_RADIUS);
    });

    result.push({ id: cId, stars });
  });

  return result;
}

export default function GalaxyScreen() {
  const { width, height } = useWindowDimensions();
  const [seed, setSeed] = useState<number>(FALLBACK_SEED);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);
  }, []);

  const constellations = useMemo(
    () => buildConstellations(seed, { centerX: width / 2, centerY: height / 2, zoom: 1 }),
    [seed, width, height],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {constellations.map((c) => (
            <Polyline
              key={c.id}
              points={c.stars.map((s) => `${s.x},${s.y}`).join(' ')}
              fill="none"
              stroke={Palette.brightLavender}
              strokeWidth={1}
              strokeOpacity={0.85}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </Svg>

        {constellations.flatMap((c) =>
          c.stars.map((s, i) => <Star key={`${c.id}-${i}`} x={s.x} y={s.y} />),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050410',
  },
  starWrap: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: Palette.brightLavender,
    opacity: 0.25,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: '#ffffff',
  },
});
