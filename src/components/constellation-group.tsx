import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Polyline, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MoodColors, Palette, type Mood } from '@/constants/theme';
import {
  blendMoodColors,
  generateConstellationShape,
  getConstellationCenter,
  slotForEntry,
  starScreenPosition,
  type Point,
  type View as GalaxyView,
} from '@/lib/galaxyPositioning';
import type { Entry } from '@/lib/entries';

const SLOT_RADIUS = 120;
const HALO = 22;
const CORE = 7;
const AURA_RADIUS = SLOT_RADIUS * 1.4;

function FilledStar({ x, y, mood }: Point & { mood: Mood }) {
  const color = MoodColors[mood];
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }, style]}>
      <View style={[styles.halo, { backgroundColor: color }]} />
      <View style={[styles.core, { backgroundColor: color }]} />
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

function ConstellationAura({
  cx,
  cy,
  color,
  radius,
  canvasWidth,
  canvasHeight,
}: {
  cx: number;
  cy: number;
  color: string;
  radius: number;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const gradientId = useRef(`aura-${Math.random().toString(36).slice(2)}`).current;
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={canvasWidth} height={canvasHeight}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={radius} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

type Props = {
  seed: number;
  constellationId: string;
  entries: Entry[];
  startYear: number;
  view: GalaxyView;
  canvasWidth: number;
  canvasHeight: number;
};

export function ConstellationGroup({
  seed,
  constellationId,
  entries,
  startYear,
  view,
  canvasWidth,
  canvasHeight,
}: Props) {
  const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  const centerDate = sorted.length > 0 ? sorted[0].date : new Date().toISOString().slice(0, 10);

  const center = getConstellationCenter(centerDate, startYear);
  const isComplete = sorted.length >= 7;
  const auraCx = view.centerX + Math.cos(center.angle) * center.radius * view.zoom;
  const auraCy = view.centerY + Math.sin(center.angle) * center.radius * view.zoom;
  const auraColor = blendMoodColors(sorted, MoodColors);
  const shape = generateConstellationShape(seed, constellationId);
  const allPositions = shape.map((p) => starScreenPosition(center, p, view, SLOT_RADIUS));
  const filledSlots = new Set(sorted.map((e) => slotForEntry(e.entryIndex)));
  const slotMoodMap = new Map(sorted.map((e) => [slotForEntry(e.entryIndex), e.mood]));
  const filledPositions = allPositions.filter((_, i) => filledSlots.has(i));

  const ghostPoints = allPositions.map((p) => `${p.x},${p.y}`).join(' ');
  const solidPoints = filledPositions.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {isComplete && (
        <ConstellationAura
          cx={auraCx}
          cy={auraCy}
          color={auraColor}
          radius={AURA_RADIUS}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
      <Svg width={canvasWidth} height={canvasHeight} style={StyleSheet.absoluteFill}>
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
        filledSlots.has(i) ? (
          <FilledStar key={`f-${i}`} x={p.x} y={p.y} mood={slotMoodMap.get(i) ?? 'NEUTRAL'} />
        ) : null,
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
    opacity: 0.25,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
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
