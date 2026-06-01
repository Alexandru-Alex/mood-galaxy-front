import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { GalaxyView } from '@/components/galaxy-view';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { api, getStoredSeed } from '@/lib/api';
import { toEntries, type Entry } from '@/lib/entries';
import { constellationIdForEntry } from '@/lib/galaxyPositioning';
import type { BackendEntry } from '@/lib/types';

const FALLBACK_SEED = 42;
const START_YEAR = 2026;

function groupByConstellation(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const cId = constellationIdForEntry(e.entryIndex);
    if (!map.has(cId)) map.set(cId, []);
    map.get(cId)!.push(e);
  }
  return map;
}

export default function GalaxyScreen() {
  const [seed, setSeed] = useState(FALLBACK_SEED);
  const [groups, setGroups] = useState<Map<string, Entry[]>>(new Map());
  const [startYear, setStartYear] = useState(START_YEAR);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);

    api.get<BackendEntry[]>('/entries')
      .then((data) => {
        if (!Array.isArray(data)) return;
        const all = toEntries(data);
        if (all.length > 0) setStartYear(new Date(all[0].date).getUTCFullYear());
        setGroups(groupByConstellation(all));
      })
      .catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      <GalaxyView seed={seed} groups={groups} startYear={startYear} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050410',
  },
});
