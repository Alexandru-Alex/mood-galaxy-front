import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConstellationGroup } from '@/components/constellation-group';
import type { Entry } from '@/lib/entries';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
const GALAXY_BASE_RADIUS = 700;
const GALAXY_RING_GAP = 350;
const CULL_MARGIN = 300;
const SECTOR_ANGLE = (Math.PI * 2) / 12; // 30° per month

type CullState = { tx: number; ty: number; s: number };
type GalaxyPos = { angle: number; radius: number; cx: number; cy: number };

// Assign non-overlapping positions by distributing same-month constellations
// evenly within their 30° sector. Different years → different ring radii.
function assignPositions(
  groups: Map<string, Entry[]>,
  startYear: number,
): Map<string, GalaxyPos> {
  const byMonthYear = new Map<string, string[]>();
  for (const [cId, entries] of groups) {
    if (!entries[0]) continue;
    const d = new Date(entries[0].date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!byMonthYear.has(key)) byMonthYear.set(key, []);
    byMonthYear.get(key)!.push(cId);
  }

  const positions = new Map<string, GalaxyPos>();
  for (const [key, cIds] of byMonthYear) {
    const [year, month] = key.split('-').map(Number);
    const yearIndex = Math.max(0, year - startYear);
    const baseAngle = -Math.PI / 2 + (month / 12) * Math.PI * 2;
    const radius = GALAXY_BASE_RADIUS + yearIndex * GALAXY_RING_GAP;
    const n = cIds.length;
    cIds.forEach((cId, i) => {
      // Spread within 70% of the sector so adjacent months don't bleed into each other
      const angle = n === 1
        ? baseAngle
        : baseAngle - (SECTOR_ANGLE * 0.7) / 2 + (i / (n - 1)) * (SECTOR_ANGLE * 0.7);
      positions.set(cId, {
        angle,
        radius,
        cx: Math.cos(angle) * radius,
        cy: Math.sin(angle) * radius,
      });
    });
  }
  return positions;
}

function isVisible(
  cx: number,
  cy: number,
  { tx, ty, s }: CullState,
  width: number,
  height: number,
): boolean {
  // Canvas point → screen: screenX = cx*s + width/2 + tx
  const screenX = cx * s + width / 2 + tx;
  const screenY = cy * s + height / 2 + ty;
  return (
    screenX > -CULL_MARGIN &&
    screenX < width + CULL_MARGIN &&
    screenY > -CULL_MARGIN &&
    screenY < height + CULL_MARGIN
  );
}

type Props = {
  seed: number;
  groups: Map<string, Entry[]>;
  startYear: number;
};

export function GalaxyView({ seed, groups, startYear }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const view = { centerX: width / 2, centerY: height / 2, zoom: 1 };

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const [cull, setCull] = useState<CullState>({ tx: 0, ty: 0, s: 1 });
  const hasCentered = useRef(false);

  const positions = assignPositions(groups, startYear);

  // Center on the most recent constellation once groups load
  useEffect(() => {
    if (hasCentered.current || positions.size === 0) return;
    hasCentered.current = true;
    const latest = [...positions.values()].pop();
    if (!latest) return;
    translateX.value = withSpring(-latest.cx, { damping: 20, stiffness: 200 });
    translateY.value = withSpring(-latest.cy, { damping: 20, stiffness: 200 });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCull({ tx: -latest.cx, ty: -latest.cy, s: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.size]);

  const updateCull = (tx: number, ty: number, s: number) => setCull({ tx, ty, s });

  const pan = Gesture.Pan()
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = savedX.value + e.translationX;
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(updateCull)(translateX.value, translateY.value, scale.value);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, savedScale.value * e.scale));
    })
    .onEnd(() => {
      runOnJS(updateCull)(translateX.value, translateY.value, scale.value);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const recenter = () => {
    const latest = [...positions.values()].pop();
    if (!latest) return;
    // eslint-disable-next-line react-hooks/immutability
    translateX.value = withSpring(-latest.cx, { damping: 20, stiffness: 200 });
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withSpring(-latest.cy, { damping: 20, stiffness: 200 });
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    setCull({ tx: -latest.cx, ty: -latest.cy, s: 1 });
  };

  // Only render constellations within the visible viewport (+margin)
  const visibleGroups = [...groups.entries()].filter(([cId]) => {
    const pos = positions.get(cId);
    if (!pos) return false;
    return isVisible(pos.cx, pos.cy, cull, width, height);
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={composed}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
            {visibleGroups.map(([cId, entries]) => (
              <ConstellationGroup
                key={cId}
                seed={seed}
                constellationId={cId}
                entries={entries}
                startYear={startYear}
                view={view}
                scale={scale}
                centerOverride={positions.get(cId)}
              />
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
      <Pressable
        style={[styles.recenterBtn, { bottom: insets.bottom + 24 }]}
        onPress={recenter}
      >
        <Text style={styles.recenterIcon}>⊕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recenterBtn: {
    position: 'absolute',
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10, 8, 40, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterIcon: {
    fontSize: 20,
    color: 'rgba(167, 139, 250, 0.9)',
  },
});
