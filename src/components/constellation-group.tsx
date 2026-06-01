import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Polyline, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  type SharedValue,
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
const DOT_RADIUS = 5;
const DOT_AURA_RADIUS = 30;

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
}: {
  cx: number;
  cy: number;
  color: string;
  radius: number;
}) {
  const gradientId = useRef(`aura-${Math.random().toString(36).slice(2)}`).current;
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Local SVG positioned at the aura center — avoids clipping when constellation is off canvas origin
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2 },
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={radius * 2} height={radius * 2}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={radius} cy={radius} r={radius} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

const CONSTELLATION_FADE_OUT = [0.5, 0.65]; // scale range where constellation fades out
const DOT_FADE_IN = [0.35, 0.5];            // scale range where dot fades in (after constellation gone)

type Props = {
  seed: number;
  constellationId: string;
  entries: Entry[];
  startYear: number;
  view: GalaxyView;
  scale: SharedValue<number>;
  centerOverride?: { angle: number; radius: number };
};

export function ConstellationGroup({
  seed,
  constellationId,
  entries,
  startYear,
  view,
  scale,
  centerOverride,
}: Props) {
  const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  const centerDate = sorted.length > 0 ? sorted[0].date : new Date().toISOString().slice(0, 10);

  const center = centerOverride ?? getConstellationCenter(centerDate, startYear);
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

  const fullStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, CONSTELLATION_FADE_OUT, [0, 1], Extrapolation.CLAMP),
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, DOT_FADE_IN, [1, 0], Extrapolation.CLAMP),
  }));

  const dotPulse = useSharedValue(1);
  useEffect(() => {
    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1100 }),
        withTiming(1, { duration: 1100 }),
      ),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotPulse.value }],
    opacity: 0.5 + 0.5 / dotPulse.value,
  }));

  const dotGradientId = useRef(`dot-${Math.random().toString(36).slice(2)}`).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, dotStyle]} pointerEvents="none">
        <Animated.View
          style={[
            styles.dotContainer,
            { left: auraCx - DOT_AURA_RADIUS, top: auraCy - DOT_AURA_RADIUS },
            dotPulseStyle,
          ]}
        >
          <Svg width={DOT_AURA_RADIUS * 2} height={DOT_AURA_RADIUS * 2}>
            <Defs>
              <RadialGradient id={dotGradientId} cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
                <Stop offset="0%" stopColor={auraColor} stopOpacity="0.55" />
                <Stop offset="100%" stopColor={auraColor} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle
              cx={DOT_AURA_RADIUS}
              cy={DOT_AURA_RADIUS}
              r={DOT_AURA_RADIUS}
              fill={`url(#${dotGradientId})`}
            />
          </Svg>
          <View style={[styles.dotCore, { backgroundColor: auraColor }]} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, fullStyle]} pointerEvents="none">
      {isComplete && (
        <ConstellationAura
          cx={auraCx}
          cy={auraCy}
          color={auraColor}
          radius={AURA_RADIUS}
        />
      )}
      <Svg
        width={SLOT_RADIUS * 2 + HALO}
        height={SLOT_RADIUS * 2 + HALO}
        style={{
          position: 'absolute',
          left: auraCx - SLOT_RADIUS - HALO / 2,
          top: auraCy - SLOT_RADIUS - HALO / 2,
        }}
      >
        <Polyline
          points={allPositions.map((p) => `${p.x - (auraCx - SLOT_RADIUS - HALO / 2)},${p.y - (auraCy - SLOT_RADIUS - HALO / 2)}`).join(' ')}
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
            points={filledPositions.map((p) => `${p.x - (auraCx - SLOT_RADIUS - HALO / 2)},${p.y - (auraCy - SLOT_RADIUS - HALO / 2)}`).join(' ')}
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
      </Animated.View>
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
  dotContainer: {
    position: 'absolute',
    width: DOT_AURA_RADIUS * 2,
    height: DOT_AURA_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: {
    position: 'absolute',
    width: DOT_RADIUS * 2,
    height: DOT_RADIUS * 2,
    borderRadius: DOT_RADIUS,
  },
});
