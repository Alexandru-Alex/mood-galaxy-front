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
import { getConstellationCenter } from '@/lib/galaxyPositioning';
import type { Entry } from '@/lib/entries';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
// Enough spacing so 12 constellations per ring don't overlap (SLOT_RADIUS=120 → footprint 240px)
const GALAXY_BASE_RADIUS = 700;
const GALAXY_RING_GAP = 350;
// Render constellations this many px beyond the visible viewport edge
const CULL_MARGIN = 300;

type CullState = { tx: number; ty: number; s: number };

function constellationCanvasOffset(
  date: string,
  startYear: number,
): { cx: number; cy: number } {
  const center = getConstellationCenter(date, startYear, {
    baseRadius: GALAXY_BASE_RADIUS,
    ringGap: GALAXY_RING_GAP,
  });
  return {
    cx: Math.cos(center.angle) * center.radius,
    cy: Math.sin(center.angle) * center.radius,
  };
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

  // Center on the most recent constellation once groups load
  useEffect(() => {
    if (hasCentered.current || groups.size === 0) return;
    hasCentered.current = true;
    const latestEntries = [...groups.values()].pop();
    if (!latestEntries?.[0]) return;
    const { cx, cy } = constellationCanvasOffset(latestEntries[0].date, startYear);
    translateX.value = withSpring(-cx, { damping: 20, stiffness: 200 });
    translateY.value = withSpring(-cy, { damping: 20, stiffness: 200 });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCull({ tx: -cx, ty: -cy, s: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

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
    const latestEntries = [...groups.values()].pop();
    if (!latestEntries?.[0]) {
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
      setCull({ tx: 0, ty: 0, s: 1 });
      return;
    }
    const { cx, cy } = constellationCanvasOffset(latestEntries[0].date, startYear);
    translateX.value = withSpring(-cx, { damping: 20, stiffness: 200 });
    translateY.value = withSpring(-cy, { damping: 20, stiffness: 200 });
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    setCull({ tx: -cx, ty: -cy, s: 1 });
  };

  // Only render constellations within the visible viewport (+margin)
  const visibleGroups = [...groups.entries()].filter(([, entries]) => {
    if (!entries[0]) return false;
    const { cx, cy } = constellationCanvasOffset(entries[0].date, startYear);
    return isVisible(cx, cy, cull, width, height);
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
                baseRadius={GALAXY_BASE_RADIUS}
                ringGap={GALAXY_RING_GAP}
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
