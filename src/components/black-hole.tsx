import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Palette } from '@/constants/theme';

type BlackHoleSize = 'full' | 'nav' | 'preview';

const SIZE_CONFIG = {
  full:    { container: 160, ring1: { w: 160, h: 46 }, ring2: { w: 120, h: 34 }, ring3: { w: 80,  h: 23 }, core: 44 },
  preview: { container: 110, ring1: { w: 110, h: 31 }, ring2: { w: 82,  h: 23 }, ring3: { w: 55,  h: 16 }, core: 30 },
  nav:     { container: 56,  ring1: { w: 56,  h: 15 }, ring2: { w: 42,  h: 11 }, ring3: null,              core: 17 },
} as const;

type Props = {
  size: BlackHoleSize;
  active?: boolean;
};

export function BlackHole({ size, active = true }: Props) {
  const cfg = SIZE_CONFIG[size];

  const rot1 = useSharedValue(0);
  const rot2 = useSharedValue(0);
  const rot3 = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(rot1);
      cancelAnimation(rot2);
      if (cfg.ring3) cancelAnimation(rot3);
      return;
    }
    rot1.value = withRepeat(withTiming(360,  { duration: 4000, easing: Easing.linear }), -1, false);
    rot2.value = withRepeat(withTiming(-360, { duration: 2800, easing: Easing.linear }), -1, false);
    if (cfg.ring3) {
      rot3.value = withRepeat(withTiming(360, { duration: 2000, easing: Easing.linear }), -1, false);
    }
  }, [active, rot1, rot2, rot3, cfg.ring3]);

  // size is treated as immutable — component should be remounted to change size
  const tiltDeg = size === 'nav' ? '65deg' : '70deg';

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ rotateX: tiltDeg }, { rotateZ: `${rot1.value}deg` }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ rotateX: tiltDeg }, { rotateZ: `${rot2.value}deg` }],
  }));
  // ring3Style is defined unconditionally (hooks cannot be conditional);
  // it is only rendered when cfg.ring3 is non-null
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ rotateX: tiltDeg }, { rotateZ: `${rot3.value}deg` }],
  }));

  const borderWidth1 = size === 'nav' ? 1.5 : 3;
  const borderWidth23 = size === 'nav' ? 1.5 : 2;

  return (
    <View style={[styles.container, { width: cfg.container, height: cfg.container }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: cfg.ring1.w,
            height: cfg.ring1.h,
            borderColor: 'rgba(171,129,205,0.75)',
            borderWidth: borderWidth1,
          },
          ring1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: cfg.ring2.w,
            height: cfg.ring2.h,
            borderColor: 'rgba(226,173,242,0.45)',
            borderWidth: borderWidth23,
          },
          ring2Style,
        ]}
      />
      {cfg.ring3 && (
        <Animated.View
          style={[
            styles.ring,
            {
              width: cfg.ring3.w,
              height: cfg.ring3.h,
              borderColor: 'rgba(87,74,226,0.55)',
              borderWidth: borderWidth23,
            },
            ring3Style,
          ]}
        />
      )}
      <View
        style={[
          styles.core,
          {
            width: cfg.core,
            height: cfg.core,
            shadowColor: Palette.brightLavender,
            shadowOpacity: size === 'nav' ? 0.9 : 0.7,
            shadowRadius: size === 'nav' ? 8 : 20,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderStyle: 'solid',
  },
  core: {
    borderRadius: 999,
    backgroundColor: '#050410',
    zIndex: 2,
    elevation: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
