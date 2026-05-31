import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ConstellationCanvas, type Entry } from '@/components/constellation-canvas';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { getStoredSeed } from '@/lib/api';

const START_YEAR = 2026;
const FALLBACK_SEED = 42;

const MOCK_ENTRIES: Entry[] = [
  { entryIndex: 0, date: '2026-01-03', mood: 'JOYFUL' },
  { entryIndex: 1, date: '2026-01-07', mood: 'CALM' },
  { entryIndex: 2, date: '2026-01-12', mood: 'NEUTRAL' },
  { entryIndex: 3, date: '2026-01-18', mood: 'SAD' },
  { entryIndex: 4, date: '2026-01-24', mood: 'ANGRY' },
  { entryIndex: 5, date: '2026-02-02', mood: 'JOYFUL' },
  { entryIndex: 6, date: '2026-02-09', mood: 'CALM' },
];

export default function GalaxyScreen() {
  const { width, height } = useWindowDimensions();
  const [seed, setSeed] = useState(FALLBACK_SEED);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      <ConstellationCanvas
        seed={seed}
        entries={MOCK_ENTRIES}
        startYear={START_YEAR}
        width={width}
        height={height}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050410',
  },
});
