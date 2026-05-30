import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';

import { Palette } from '@/constants/theme';

export type StarPoint = { x: number; y: number };

const HALO = 22;
const CORE = 7;

function Star({ x, y }: StarPoint) {
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

type ConstellationProps = {
  stars: StarPoint[];
  complete: boolean;
};

/** Renders placed stars (glowing dots) and, once complete, the thin line linking them in order. */
export function Constellation({ stars, complete }: ConstellationProps) {
  const lineOpacity = useSharedValue(0);

  useEffect(() => {
    lineOpacity.value = withTiming(complete ? 1 : 0, { duration: 700 });
  }, [complete, lineOpacity]);

  const lineStyle = useAnimatedStyle(() => ({ opacity: lineOpacity.value }));

  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const points = stars.map((s) => `${s.x},${s.y}`).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {stars.length >= 2 && size.width > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, lineStyle]}>
          <Svg width={size.width} height={size.height}>
            <Polyline
              points={points}
              fill="none"
              stroke={Palette.brightLavender}
              strokeWidth={1}
              strokeOpacity={0.85}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      )}
      {stars.map((s, i) => (
        <Star key={i} x={s.x} y={s.y} />
      ))}
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
});
