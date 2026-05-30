import { useEffect, useMemo } from 'react';
import { type DimensionValue, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Palette } from '@/constants/theme';
import { styles } from '@/components/starfield.styles';

const STAR_COLORS = [
  '#ffffff',
  Palette.brightLavender,
  Palette.mauve,
  Palette.majorelleBlue,
  Palette.dustyGrape,
] as const;

type StarData = {
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  color: string;
  minOpacity: number;
  duration: number;
  delay: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function generateStars(count: number): StarData[] {
  return Array.from({ length: count }, () => ({
    top: `${rand(0, 100)}%` as DimensionValue,
    left: `${rand(0, 100)}%` as DimensionValue,
    size: rand(1, 3.5),
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    minOpacity: rand(0.15, 0.45),
    duration: rand(1200, 3200),
    delay: rand(0, 2500),
  }));
}

function Star({ top, left, size, color, minOpacity, duration, delay }: StarData) {
  const progress = useSharedValue(minOpacity);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [progress, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View
      style={[
        styles.star,
        { top, left, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

type StarfieldProps = {
  count?: number;
};

export function Starfield({ count = 90 }: StarfieldProps) {
  const stars = useMemo(() => generateStars(count), [count]);

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((star, index) => (
        <Star key={index} {...star} />
      ))}
    </View>
  );
}
