import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';

import { GalaxyView } from '@/components/galaxy-view';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { getStoredSeed } from '@/lib/api';
import { fetchEntriesByMonth, fetchMonthSummary, type Entry } from '@/lib/entries';
import { constellationIdForEntry } from '@/lib/galaxyPositioning';

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
  const loadedMonths = useRef(new Set<string>());
  const pendingMonths = useRef(new Set<string>());
  const constellationToMonth = useRef(new Map<string, string>());
  const allSummaryMonths = useRef<string[]>([]);
  const initialLoadFired = useRef(false);

  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      // Drop the current month from the cache so any entries added since last
      // visit (e.g. the one that just triggered the constellation celebration)
      // are picked up on the next visible-months pass.
      const currentMonth = new Date().toISOString().slice(0, 7);
      loadedMonths.current.delete(currentMonth);
      handleVisibleMonthsChange([currentMonth]);
      return () => setFocused(false);
    }, [handleVisibleMonthsChange]),
  );

  const pendingUpdates = useRef(new Map<string, Entry[]>());
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, []);

  const flushPendingUpdates = useCallback(() => {
    const snapshot = new Map(pendingUpdates.current);
    pendingUpdates.current.clear();
    batchTimer.current = null;

    setGroups((prev) => {
      const next = new Map(prev);
      for (const [cId, newEntries] of snapshot) {
        const existing = (next.get(cId) ?? []).filter((e) => e.entryIndex >= 0);
        const merged = [...existing, ...newEntries];
        const deduped = [
          ...new Map(merged.map((e) => [e.entryIndex, e])).values(),
        ].sort((a, b) => a.entryIndex - b.entryIndex);
        next.set(cId, deduped);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    getStoredSeed()
      .then((s) => { if (s !== null) setSeed(s); })
      .catch(console.error);

    (async () => {
      const summary = await fetchMonthSummary();
      const skeleton = new Map<string, Entry[]>();
      allSummaryMonths.current = summary.map((s) => s.month);
      // summary is sorted ascending — first occurrence of a cId is its earliest (correct) month.
      // A constellation that straddles two months must only be assigned to the first month,
      // otherwise assignPositions() would place it in the wrong ring after real entries load.
      const seenIds = new Set<string>();
      for (const { month, constellationIds } of summary) {
        const skeletonDate = `${month}-01`;
        for (const cId of constellationIds) {
          if (seenIds.has(cId)) continue;
          seenIds.add(cId);
          skeleton.set(cId, [{ entryIndex: -1, date: skeletonDate, mood: 'NEUTRAL' as const }]);
          constellationToMonth.current.set(cId, month);
        }
      }
      if (summary.length > 0) {
        setStartYear(new Date(`${summary[0].month}-01`).getUTCFullYear());
      }
      setGroups(skeleton);
    })().catch(console.error);
  }, []);

  const handleVisibleMonthsChange = useCallback((months: string[]) => {
    const toFetch = months.filter(
      (m) => !loadedMonths.current.has(m) && !pendingMonths.current.has(m),
    );
    if (toFetch.length === 0) return;

    for (const m of toFetch) pendingMonths.current.add(m);

    for (const month of toFetch) {
      fetchEntriesByMonth(month)
        .then((entries) => {
          const incoming = groupByConstellation(entries);
          for (const [cId, newEntries] of incoming) {
            const existing = pendingUpdates.current.get(cId) ?? [];
            pendingUpdates.current.set(cId, [...existing, ...newEntries]);
          }
          if (!batchTimer.current) {
            batchTimer.current = setTimeout(flushPendingUpdates, 0);
          }
          loadedMonths.current.add(month);
          pendingMonths.current.delete(month);
        })
        .catch(() => {
          setTimeout(() => pendingMonths.current.delete(month), 5000);
        });
    }
  }, [flushPendingUpdates]);

  // Fire initial load once skeleton is populated (without needing user to pan first)
  useEffect(() => {
    if (groups.size === 0 || initialLoadFired.current) return;
    initialLoadFired.current = true;
    // Use all months from summary, not just months where a constellation starts.
    // A month with only cross-boundary entries (trailing slots of a constellation
    // that started in a prior month) would otherwise never be fetched.
    handleVisibleMonthsChange(allSummaryMonths.current.slice(-3));
  }, [groups.size, handleVisibleMonthsChange]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield active={focused} />
      <GalaxyView
        seed={seed}
        groups={groups}
        startYear={startYear}
        onVisibleMonthsChange={handleVisibleMonthsChange}
        active={focused}
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
