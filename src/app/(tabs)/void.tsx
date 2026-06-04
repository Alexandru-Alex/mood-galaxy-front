import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlackHole } from '@/components/black-hole';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { useVoid } from '@/context/void-context';
import { Palette } from '@/constants/theme';

const PRESETS = [
  { label: '5m',  seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '20m', seconds: 1200 },
  { label: '30m', seconds: 1800 },
  { label: '60m', seconds: 3600 },
];

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

  if (status === 'running') {
    return <ActiveSession remainingSeconds={remainingSeconds} />;
  }
  if (status === 'complete') {
    return <CompleteScreen durationSeconds={durationSeconds} onReset={resetSession} />;
  }
  return <SelectionScreen onStart={startSession} insetTop={insets.top} />;
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
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield count={50} />
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
        <View style={styles.summaryCard}>
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
    backgroundColor: 'rgba(34,42,104,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  presetBtnSelected: {
    backgroundColor: 'rgba(87,74,226,0.35)',
    borderColor: Palette.brightLavender,
  },
  presetText: {
    fontSize: 13,
    color: '#b9b3d6',
  },
  presetTextSelected: {
    color: '#e2adf2',
  },
  ctaBtn: {
    backgroundColor: Palette.majorelleBlue,
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 12,
  },
  ctaBtnDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f3eefb',
    letterSpacing: 0.3,
  },
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
  summaryCard: {
    backgroundColor: 'rgba(34,42,104,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  summaryDuration: {
    fontSize: 32,
    fontWeight: '200',
    color: Palette.brightLavender,
    letterSpacing: 2,
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(185,179,214,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 3,
  },
});
