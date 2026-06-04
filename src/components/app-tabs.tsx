import { useEffect, useState } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BlackHole } from '@/components/black-hole';
import { Palette } from '@/constants/theme';
import { useVoid } from '@/context/void-context';

// Radius of the circular notch (matches voidTabBtn radius + small gap)
const NOTCH_R = 42;
// Bezier smoothing on the sides of the notch
const NOTCH_S = 18;

function CurvedBackground({ width, height }: { width: number; height: number }) {
  const cx = width / 2;
  const r = NOTCH_R;
  const s = NOTCH_S;

  // Background fill with smooth curved notch cut from the top center
  const fill = [
    `M 0 0`,
    `H ${cx - r - s}`,
    `C ${cx - r} 0 ${cx - r} ${r} ${cx} ${r}`,
    `C ${cx + r} ${r} ${cx + r} 0 ${cx + r + s} 0`,
    `H ${width}`,
    `V ${height}`,
    `H 0`,
    `Z`,
  ].join(' ');

  // Thin border line following the same curved path
  const border = [
    `M 0 0`,
    `H ${cx - r - s}`,
    `C ${cx - r} 0 ${cx - r} ${r} ${cx} ${r}`,
    `C ${cx + r} ${r} ${cx + r} 0 ${cx + r + s} 0`,
    `H ${width}`,
  ].join(' ');

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Path d={fill} fill="rgba(5,4,16,0.97)" />
      <Path d={border} fill="none" stroke="rgba(171,129,205,0.25)" strokeWidth={0.5} />
    </Svg>
  );
}

type TabIconProps = TabTriggerSlotProps & {
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
};

function TabIconButton({ isFocused, icon, iconOutline, ...props }: TabIconProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabBtn, pressed && { opacity: 0.6 }]}
    >
      <Ionicons
        name={isFocused ? icon : iconOutline}
        size={26}
        color={isFocused ? Palette.brightLavender : 'rgba(255,255,255,0.38)'}
      />
    </Pressable>
  );
}

type VoidTabButtonProps = TabTriggerSlotProps;

function VoidTabButton({ isFocused, ...props }: VoidTabButtonProps) {
  const { status } = useVoid();
  const isRunning = status === 'running';

  const pulseScale = useSharedValue(0.8);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRunning) {
      pulseScale.value = withRepeat(
        withTiming(1.4, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 0.8;
      pulseOpacity.value = 0;
    }
  }, [isRunning]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.voidTabOuter, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.voidTabBtn}>
        {isRunning && (
          <Animated.View style={[styles.pulseRing, pulseStyle]} />
        )}
        <BlackHole size="nav" active={true} />
      </View>
    </Pressable>
  );
}

function BottomBar({ children, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [barHeight, setBarHeight] = useState(0);

  return (
    <View
      {...props}
      onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      {barHeight > 0 && <CurvedBackground width={width} height={barHeight} />}
      {children}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <BottomBar>
          <TabTrigger name="index" href="/" asChild>
            <TabIconButton icon="home" iconOutline="home-outline" />
          </TabTrigger>
          <TabTrigger name="galaxy" href="/galaxy" asChild>
            <TabIconButton icon="planet" iconOutline="planet-outline" />
          </TabTrigger>
          <TabTrigger name="void" href="/void" asChild>
            <VoidTabButton />
          </TabTrigger>
          <TabTrigger name="journal" href="/journal" asChild>
            <TabIconButton icon="book" iconOutline="book-outline" />
          </TabTrigger>
          <TabTrigger name="you" href="/you" asChild>
            <TabIconButton icon="person" iconOutline="person-outline" />
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingTop: 10,
    alignItems: 'center',
    overflow: 'visible',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  voidTabOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  voidTabBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#050410',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(171,129,205,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
    shadowColor: Palette.brightLavender,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(171,129,205,0.45)',
  },
});
