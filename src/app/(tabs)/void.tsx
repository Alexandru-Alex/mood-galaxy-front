import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlackHole } from '@/components/black-hole';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { useVoid } from '@/context/void-context';
import { Palette } from '@/constants/theme';

const PRESETS = [
  { label: '1m',  seconds: 60 },
  { label: '5m',  seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '20m', seconds: 1200 },
  { label: '30m', seconds: 1800 },
  { label: '60m', seconds: 3600 },
];

const INTRO_LINES = [
  'In the beginning',
  'there was darkness',
  'and silence.',
];

// Total intro duration before timer starts
const INTRO_DURATION_MS = 4200;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export default function VoidScreen() {
  const { status, durationSeconds, remainingSeconds, startSession, resetSession } = useVoid();
  const insets = useSafeAreaInsets();

  // Intro: holds selected duration while entering animation plays
  const [enteringFor, setEnteringFor] = useState<number | null>(null);
  // Exit: plays reverse animation when timer ends before showing CompleteScreen
  const [showExitAnim, setShowExitAnim] = useState(false);
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current === 'running' && status === 'complete') {
      setShowExitAnim(true);
    }
    prevStatus.current = status;
  }, [status]);

  // Hide status bar + Android nav bar when immersed, restore on exit
  const isImmersed = enteringFor !== null || status === 'running' || showExitAnim;
  useEffect(() => {
    if (isImmersed) {
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('hidden');
      }
    } else {
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
      }
    }
    return () => {
      if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('visible');
    };
  }, [isImmersed]);

  const handleEnter = (seconds: number) => setEnteringFor(seconds);

  const handleIntroComplete = () => {
    if (enteringFor !== null) {
      startSession(enteringFor);
      setEnteringFor(null);
    }
  };

  if (enteringFor !== null) {
    return <EnteringVoidAnimation onComplete={handleIntroComplete} />;
  }
  if (showExitAnim) {
    return <ExitingVoidAnimation onComplete={() => setShowExitAnim(false)} />;
  }
  if (status === 'running') {
    return <ActiveSession remainingSeconds={remainingSeconds} />;
  }
  if (status === 'complete') {
    return <CompleteScreen durationSeconds={durationSeconds} onReset={resetSession} />;
  }
  return <SelectionScreen onStart={handleEnter} insetTop={insets.top} />;
}

function EnteringVoidAnimation({ onComplete }: { onComplete: () => void }) {
  const holeScale = useSharedValue(1);
  const blackOverlay = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Phase 1 — black hole rapidly expands (0 → 1.4s)
    holeScale.value = withTiming(18, {
      duration: 1400,
      easing: Easing.in(Easing.ease),
    });

    // Phase 2 — screen fades to black (starts at 700ms)
    blackOverlay.value = withDelay(700, withTiming(1, { duration: 900 }));

    // Phase 3 — text fades in (starts at 1.8s)
    textOpacity.value = withDelay(1800, withTiming(1, { duration: 700 }));

    // Phase 4 — start session after full intro
    const timer = setTimeout(() => onCompleteRef.current(), INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const holeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: holeScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: blackOverlay.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <SpaceBackground />
      <Starfield count={50} />

      {/* Black hole scaling up */}
      <View style={styles.activeContent} pointerEvents="none">
        <Animated.View style={holeStyle}>
          <BlackHole size="full" />
        </Animated.View>
      </View>

      {/* Fade to black */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.blackOverlay, overlayStyle]}
        pointerEvents="none"
      />

      {/* Poetic text */}
      <Animated.View style={[styles.introTextWrap, textStyle]} pointerEvents="none">
        {INTRO_LINES.map((line, i) => (
          <Text key={i} style={styles.introText}>{line}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

function ExitingVoidAnimation({ onComplete }: { onComplete: () => void }) {
  const holeScale = useSharedValue(1);
  // Overlay corners round off first (borderRadius 0 → large), then whole thing shrinks
  const overlayRadius = useSharedValue(0);
  const overlayScale = useSharedValue(1);
  const overlayOpacity = useSharedValue(1);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Phase 1 (0-700ms): corners round off — stars peek through corners first
    overlayRadius.value = withTiming(500, { duration: 700, easing: Easing.out(Easing.ease) });

    // Phase 2 (400-1300ms): circle shrinks to center
    overlayScale.value = withDelay(400, withTiming(0, {
      duration: 900,
      easing: Easing.in(Easing.ease),
    }));

    // Phase 2b: slight opacity fade as it shrinks
    overlayOpacity.value = withDelay(900, withTiming(0, { duration: 400 }));

    // Phase 3 (500-1300ms): black hole also shrinks with the overlay
    holeScale.value = withDelay(500, withTiming(0, {
      duration: 800,
      easing: Easing.in(Easing.ease),
    }));

    const timer = setTimeout(() => onCompleteRef.current(), 1600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const holeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: holeScale.value }],
    opacity: holeScale.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
    borderRadius: overlayRadius.value,
  }));

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <SpaceBackground />
      <Starfield count={50} />
      <View style={styles.activeContent} pointerEvents="none">
        <Animated.View style={holeStyle}>
          <BlackHole size="full" />
        </Animated.View>
      </View>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.blackOverlay, overlayStyle]}
        pointerEvents="none"
      />
    </View>
  );
}

function SelectionScreen({ onStart, insetTop }: { onStart: (s: number) => void; insetTop: number }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield count={50} />
      <View style={[styles.selectionContent, { paddingTop: insetTop + 24 }]}>
        <Text style={styles.title}>VOID</Text>
        <Text style={styles.subtitle}>Enter the silence</Text>
        <BlackHole size="preview" />
        <Text style={styles.durationLabel}>Duration</Text>
        <View style={styles.presetRow}>
          {PRESETS.map(({ label, seconds }) => (
            <Pressable
              key={seconds}
              onPress={() => setSelected(seconds)}
              style={[styles.presetBtn, selected === seconds && styles.presetBtnSelected]}
            >
              <Text style={[styles.presetText, selected === seconds && styles.presetTextSelected]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => selected !== null && onStart(selected)}
          style={[styles.ctaBtn, selected === null && styles.ctaBtnDisabled]}
        >
          <Text style={styles.ctaText}>Enter Void</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ActiveSession({ remainingSeconds }: { remainingSeconds: number }) {
  return (
    <View style={styles.activeScreen}>
      <StatusBar hidden />
      <View style={styles.activeContent}>
        <BlackHole size="full" />
        <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
        <Text style={styles.timerLabel}>remaining</Text>
      </View>
    </View>
  );
}

function CompleteScreen({ durationSeconds, onReset }: { durationSeconds: number; onReset: () => void }) {
  const minutes = Math.round(durationSeconds / 60);
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield count={50} />
      <View style={styles.completeContent}>
        <View style={styles.completeCoreWrap}>
          <View style={styles.completeCoreFade} />
          <View style={styles.completeCore} />
        </View>
        <Text style={styles.completeTitle}>You emerged</Text>
        <Text style={styles.completeSubtitle}>from the void</Text>
        <View style={styles.summaryWrap}>
          <Text style={styles.summaryDuration}>{minutes < 1 ? '<1' : String(minutes)}</Text>
          <Text style={styles.summaryLabel}>minutes in silence</Text>
        </View>
        <Pressable onPress={onReset} style={styles.ctaBtn}>
          <Text style={styles.ctaText}>Back to galaxy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050410',
  },
  activeScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Intro animation
  blackOverlay: {
    backgroundColor: '#000',
  },
  introTextWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  introText: {
    fontSize: 20,
    fontWeight: '200',
    color: Palette.mauve,
    letterSpacing: 2,
    textAlign: 'center',
  },
  // Selection
  selectionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#f3eefb',
    letterSpacing: 6,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#b9b3d6',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 28,
  },
  durationLabel: {
    fontSize: 10,
    color: 'rgba(185,179,214,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    marginTop: 26,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  presetBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(171,129,205,0.35)',
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  presetBtnSelected: {
    borderColor: Palette.brightLavender,
    shadowColor: Palette.brightLavender,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(226,173,242,0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  presetTextSelected: {
    color: Palette.mauve,
  },
  ctaBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Palette.brightLavender,
    borderRadius: 32,
    paddingHorizontal: 36,
    paddingVertical: 14,
    shadowColor: Palette.brightLavender,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  ctaBtnDisabled: {
    opacity: 0.35,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mauve,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Active session
  activeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '200',
    color: Palette.brightLavender,
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
    marginTop: 28,
    textShadowColor: Palette.brightLavender,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  timerLabel: {
    fontSize: 10,
    color: 'rgba(171,129,205,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginTop: 8,
  },
  // Complete
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  completeCoreWrap: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  completeCoreFade: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(87,74,226,0.12)',
  },
  completeCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#050410',
    shadowColor: Palette.brightLavender,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: '#f3eefb',
    letterSpacing: 0.5,
  },
  completeSubtitle: {
    fontSize: 11,
    color: '#b9b3d6',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  summaryWrap: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(171,129,205,0.2)',
    width: '70%',
    marginTop: 4,
  },
  summaryDuration: {
    fontSize: 52,
    fontWeight: '200',
    color: Palette.brightLavender,
    letterSpacing: 4,
    textShadowColor: Palette.brightLavender,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(171,129,205,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 6,
  },
});
