import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { MoodColors, Palette } from '@/constants/theme';
import { generateConstellationShape } from '@/lib/galaxyPositioning';
import type { Entry } from '@/lib/entries';

// Maps an x/y in [-1,1] space to SVG coords inside a 60x60 canvas
const MINI_SIZE = 60;
const MINI_PADDING = 8;
const MINI_RANGE = (MINI_SIZE / 2) - MINI_PADDING; // 22

function toSvgCoord(v: number): number {
  return MINI_SIZE / 2 + v * MINI_RANGE;
}

const SPARKLE_OFFSETS: { dx: number; dy: number; delay: number }[] = [
  { dx: -28, dy: -20, delay: 0 },
  { dx:  28, dy: -24, delay: 80 },
  { dx: -20, dy:  10, delay: 160 },
  { dx:  24, dy:   8, delay: 240 },
];

type Props = {
  seed: number;
  constellationId: string;
  entries: Entry[];          // the 7 completed entries, in slot order
  constellationX: number;    // screen-space X of constellation center
  constellationY: number;    // screen-space Y of constellation center
  onViewGalaxy: () => void;
  onDismiss: () => void;
};

export function ConstellationCelebration({
  seed,
  constellationId,
  entries,
  constellationX,
  constellationY,
  onViewGalaxy,
  onDismiss,
}: Props) {
  const points = generateConstellationShape(seed, constellationId);
  const polylinePoints = points
    .map((p) => `${toSvgCoord(p.x)},${toSvgCoord(p.y)}`)
    .join(' ');

  // Banner slide-up + fade
  const bannerY = useSharedValue(20);
  const bannerOpacity = useSharedValue(0);

  // Sparkle animations — one shared value per sparkle
  const s0y = useSharedValue(0); const s0op = useSharedValue(0);
  const s1y = useSharedValue(0); const s1op = useSharedValue(0);
  const s2y = useSharedValue(0); const s2op = useSharedValue(0);
  const s3y = useSharedValue(0); const s3op = useSharedValue(0);

  const sparkleAnims = [
    { y: s0y, op: s0op },
    { y: s1y, op: s1op },
    { y: s2y, op: s2op },
    { y: s3y, op: s3op },
  ];

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);

  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Banner enters after 400ms
    bannerY.value = withDelay(400, withSpring(0, { damping: 18, stiffness: 160 }));
    bannerOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));

    // Sparkles
    SPARKLE_OFFSETS.forEach(({ delay }, i) => {
      sparkleAnims[i].op.value = withDelay(
        delay,
        withSequence(withTiming(1, { duration: 300 }), withDelay(500, withTiming(0, { duration: 400 }))),
      );
      sparkleAnims[i].y.value = withDelay(
        delay,
        withTiming(-12, { duration: 1200, easing: Easing.out(Easing.quad) }),
      );
    });

    // Auto-dismiss after 5s
    dismissTimer.current = setTimeout(() => {
      bannerOpacity.value = withTiming(0, { duration: 300 });
      bannerY.value = withTiming(20, { duration: 300 });
      dismissFadeTimer.current = setTimeout(() => {
        if (!dismissed.current) { dismissed.current = true; onDismissRef.current(); }
      }, 320);
    }, 5000);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (dismissFadeTimer.current) clearTimeout(dismissFadeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerY.value }],
  }));

  const s0Style = useAnimatedStyle(() => ({ opacity: s0op.value, transform: [{ translateY: s0y.value }] }));
  const s1Style = useAnimatedStyle(() => ({ opacity: s1op.value, transform: [{ translateY: s1y.value }] }));
  const s2Style = useAnimatedStyle(() => ({ opacity: s2op.value, transform: [{ translateY: s2y.value }] }));
  const s3Style = useAnimatedStyle(() => ({ opacity: s3op.value, transform: [{ translateY: s3y.value }] }));
  const sparkleStyles = [s0Style, s1Style, s2Style, s3Style];

  function handleViewGalaxy() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (dismissFadeTimer.current) clearTimeout(dismissFadeTimer.current);
    bannerOpacity.value = withTiming(0, { duration: 200 });
    bannerY.value = withTiming(20, { duration: 200 });
    onViewGalaxy();
    dismissFadeTimer.current = setTimeout(() => {
      if (!dismissed.current) { dismissed.current = true; onDismissRef.current(); }
    }, 220);
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Sparkles positioned around constellation center */}
      {SPARKLE_OFFSETS.map(({ dx, dy }, i) => (
        <Animated.Text
          key={i}
          pointerEvents="none"
          style={[
            styles.sparkle,
            {
              left: constellationX + dx - 6,
              top: constellationY + dy - 6,
              color: MoodColors[entries[i]?.mood ?? 'CALM'],
            },
            sparkleStyles[i],
          ]}
        >
          ✦
        </Animated.Text>
      ))}

      {/* Banner anchored to bottom, above the CTA button */}
      <Animated.View style={[styles.bannerWrap, bannerStyle]} pointerEvents="box-none">
        <View style={styles.banner}>
          {/* Mini constellation SVG */}
          <View style={styles.miniConstellation}>
            <Svg width={MINI_SIZE} height={MINI_SIZE}>
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke="rgba(168,143,224,0.4)"
                strokeWidth="1"
              />
              {points.map((p, i) => {
                const entry = entries[i];
                const color = entry ? MoodColors[entry.mood] : Palette.mauve;
                return (
                  <Circle
                    key={i}
                    cx={toSvgCoord(p.x)}
                    cy={toSvgCoord(p.y)}
                    r={3.5}
                    fill={color}
                  />
                );
              })}
            </Svg>
          </View>

          {/* Text */}
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>✦  Constellation complete</Text>
            <Pressable onPress={handleViewGalaxy}>
              <Text style={styles.bannerSub}>7 moods · View in galaxy →</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerWrap: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(91,58,185,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,105,235,0.35)',
    borderRadius: 12,
    padding: 12,
  },
  miniConstellation: {
    width: MINI_SIZE,
    height: MINI_SIZE,
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: 12,
    color: Palette.brightLavender,
  },
});
