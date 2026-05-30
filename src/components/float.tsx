import { useEffect, type ReactNode } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type FloatProps = {
  children: ReactNode;
  /** Total vertical travel in px (peak-to-peak). */
  amplitude?: number;
  /** Duration of one half-cycle in ms. */
  duration?: number;
};

/** Wraps children in a gentle, looping up/down drift — like levitating in space. */
export function Float({ children, amplitude = 10, duration = 1800 }: FloatProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (0.5 - progress.value) * amplitude }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
