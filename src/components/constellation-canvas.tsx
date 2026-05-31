import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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

export type Entry = { entryIndex: number; date: string; mood: string };

const SLOT_RADIUS = 120;
const HALO = 22;
const CORE = 7;

function FilledStar({ x, y }: Point) {
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

function GhostStar({ x, y }: Point) {
  return (
    <View style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }]}>
      <View style={styles.ghost} />
    </View>
  );
}

type Props = {
  seed: number;
  entries: Entry[];
  startYear: number;
  width: number;
  height: number;
};

export function ConstellationCanvas({ seed, entries, startYear, width, height }: Props) {
  const view: GalaxyView = { centerX: width / 2, centerY: height / 2, zoom: 1 };
  const cId = entries.length > 0 ? constellationIdForEntry(entries[0].entryIndex) : 'c0';
  const centerDate =
    entries.length > 0 ? entries[0].date : new Date().toISOString().slice(0, 10);

  const center = getConstellationCenter(centerDate, startYear);
  const shape = generateConstellationShape(seed, cId);
  const allPositions = shape.map((p) => starScreenPosition(center, p, view, SLOT_RADIUS));
  const filledSlots = new Set(entries.map((e) => slotForEntry(e.entryIndex)));
  const filledPositions = allPositions.filter((_, i) => filledSlots.has(i));

  const ghostPoints = allPositions.map((p) => `${p.x},${p.y}`).join(' ');
  const solidPoints = filledPositions.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Polyline
          points={ghostPoints}
          fill="none"
          stroke={Palette.brightLavender}
          strokeWidth={1}
          strokeOpacity={0.3}
          strokeDasharray="4 6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {filledPositions.length >= 2 && (
          <Polyline
            points={solidPoints}
            fill="none"
            stroke={Palette.brightLavender}
            strokeWidth={1}
            strokeOpacity={0.85}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </Svg>
      {allPositions.map((p, i) =>
        filledSlots.has(i) ? null : <GhostStar key={i} x={p.x} y={p.y} />,
      )}
      {allPositions.map((p, i) =>
        filledSlots.has(i) ? <FilledStar key={`f-${i}`} x={p.x} y={p.y} /> : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  ghost: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    borderWidth: 1,
    borderColor: Palette.brightLavender,
    opacity: 0.4,
  },
});
