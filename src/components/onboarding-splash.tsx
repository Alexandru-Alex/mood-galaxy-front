import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Palette, Spacing } from '@/constants/theme';
import { setOnboardingComplete } from '@/lib/api';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';

type Props = {
  onBegin: () => void;
  onSkip: () => void;
};

export function OnboardingSplash({ onBegin, onSkip }: Props) {
  // Each element fades + slides up in sequence
  const iconScale = useSharedValue(0);
  const auraOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(16);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(16);
  const btnOpacity = useSharedValue(0);
  const btnY = useSharedValue(16);

  useEffect(() => {
    const timingCfg = { duration: 350, easing: Easing.out(Easing.quad) };
    iconScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
    auraOpacity.value = withTiming(1, { duration: 600 });
    titleOpacity.value = withDelay(150, withTiming(1, timingCfg));
    titleY.value = withDelay(150, withTiming(0, timingCfg));
    subtitleOpacity.value = withDelay(280, withTiming(1, timingCfg));
    subtitleY.value = withDelay(280, withTiming(0, timingCfg));
    btnOpacity.value = withDelay(400, withTiming(1, timingCfg));
    btnY.value = withDelay(400, withTiming(0, timingCfg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  const auraStyle = useAnimatedStyle(() => ({ opacity: auraOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }],
  }));

  async function handleBegin() {
    await setOnboardingComplete();
    onBegin();
  }

  async function handleSkip() {
    await setOnboardingComplete();
    onSkip();
  }

  return (
    <Modal animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.root}>
        <SpaceBackground />
        <Starfield />

        <Pressable style={styles.skip} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>

        <View style={styles.center}>
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.aura, auraStyle]} />
            <Animated.Text style={[styles.icon, iconStyle]}>✦</Animated.Text>
          </View>

          <Animated.Text style={[styles.title, titleStyle]}>
            Your moods become stars
          </Animated.Text>

          <Animated.Text style={[styles.subtitle, subtitleStyle]}>
            Every feeling you log lights up a star{'\n'}
            in your personal galaxy.{'\n'}
            7 stars form a constellation.
          </Animated.Text>

          <Animated.View style={btnStyle}>
            <Pressable style={styles.btn} onPress={handleBegin}>
              <Text style={styles.btnText}>✦  Log your first mood</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050410',
  },
  skip: {
    position: 'absolute',
    top: 56,
    right: Spacing.four,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 13,
    color: 'rgba(168,143,224,0.6)',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: 0,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  aura: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    shadowColor: Palette.brightLavender,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.5,
  },
  icon: {
    fontSize: 48,
    color: '#ffffff',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: Palette.brightLavender,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 32,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Palette.brightLavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mauve,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
