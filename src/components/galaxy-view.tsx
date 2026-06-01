import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';

import { ConstellationGroup } from '@/components/constellation-group';
import type { Entry } from '@/lib/entries';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
const MINI_THRESHOLD = 0.5;

type Props = {
  seed: number;
  groups: Map<string, Entry[]>;
  startYear: number;
};

export function GalaxyView({ seed, groups, startYear }: Props) {
  const { width, height } = useWindowDimensions();
  const view = { centerX: width / 2, centerY: height / 2, zoom: 1 };

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Saved values at gesture start — prevents jumps when starting a new gesture
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const [minimized, setMinimized] = useState(false);
  useAnimatedReaction(
    () => scale.value < MINI_THRESHOLD,
    (isMini, wasMini) => {
      if (isMini !== wasMini) runOnJS(setMinimized)(isMini);
    },
  );

  const pan = Gesture.Pan()
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, savedScale.value * e.scale));
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          {[...groups.entries()].map(([cId, entries]) => (
            <ConstellationGroup
              key={cId}
              seed={seed}
              constellationId={cId}
              entries={entries}
              startYear={startYear}
              view={view}
              canvasWidth={width}
              canvasHeight={height}
              minimized={minimized}
            />
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
