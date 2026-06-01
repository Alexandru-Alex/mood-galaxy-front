import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { constellationIdForEntry } from '@/lib/galaxyPositioning';
import type { Entry } from '@/lib/entries';
import { ConstellationGroup } from '@/components/constellation-group';

export type { Entry } from '@/lib/entries';

type Props = {
  seed: number;
  entries: Entry[];
  startYear: number;
  width: number;
  height: number;
  onStarPress?: (date: string) => void;
};

export function ConstellationCanvas({ seed, entries, startYear, width, height, onStarPress }: Props) {
  const view = { centerX: width / 2, centerY: height / 2, zoom: 1 };
  const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  const lastEntry = sorted[sorted.length - 1];
  const currentCId = lastEntry ? constellationIdForEntry(lastEntry.entryIndex) : 'c0';
  const currentEntries = sorted.filter((e) => constellationIdForEntry(e.entryIndex) === currentCId);
  const scale = useSharedValue(1);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={onStarPress ? 'box-none' : 'none'}>
      <ConstellationGroup
        seed={seed}
        constellationId={currentCId}
        entries={currentEntries}
        startYear={startYear}
        view={view}
        scale={scale}
        onStarPress={onStarPress}
      />
    </View>
  );
}
