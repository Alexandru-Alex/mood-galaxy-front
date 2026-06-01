import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConstellationGroup } from '@/components/constellation-group';
import type { Entry } from '@/lib/entries';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

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

  // Saved values at gesture start — prevents jumps when starting a new gesture
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

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

  const recenter = () => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
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
                scale={scale}
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
