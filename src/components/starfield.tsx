import { useEffect, useMemo } from 'react';
import { type DimensionValue, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
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

function StarInGroup({ star, progress }: { star: StarData; progress: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: star.minOpacity + progress.value * (1 - star.minOpacity),
  }));
  return (
    <Animated.View
      style={[
        styles.star,
        {
          top: star.top,
          left: star.left,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: star.color,
        },
        animatedStyle,
      ]}
    />
  );
}

// 5 stars share one shared value → 12 animations instead of 60
const GROUP_SIZE = 5;

function StarGroup({ stars, active }: { stars: StarData[]; active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      return;
    }
    const avgDelay = stars.reduce((s, st) => s + st.delay, 0) / stars.length;
    const avgDuration = stars.reduce((s, st) => s + st.duration, 0) / stars.length;
    progress.value = withDelay(
      avgDelay,
      withRepeat(withTiming(1, { duration: avgDuration, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [active, progress, stars]);

  return (
    <>
      {stars.map((star, i) => (
        <StarInGroup key={i} star={star} progress={progress} />
      ))}
    </>
  );
}

type StarfieldProps = {
  count?: number;
  active?: boolean;
};

export function Starfield({ count = 60, active = true }: StarfieldProps) {
  const stars = useMemo(() => generateStars(count), [count]);

  const groups = useMemo(() => {
    const result: StarData[][] = [];
    for (let i = 0; i < stars.length; i += GROUP_SIZE) {
      result.push(stars.slice(i, i + GROUP_SIZE));
    }
    return result;
  }, [stars]);

  return (
    <View style={styles.container} pointerEvents="none">
      {groups.map((group, i) => (
        <StarGroup key={i} stars={group} active={active} />
      ))}
    </View>
  );
}
