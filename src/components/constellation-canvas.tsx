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
};

export function ConstellationCanvas({ seed, entries, startYear, width, height }: Props) {
  const view = { centerX: width / 2, centerY: height / 2, zoom: 1 };
  const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  const cId = sorted.length > 0 ? constellationIdForEntry(sorted[0].entryIndex) : 'c0';
  // Fixed scale — dashboard always shows full constellation, never minimized
  const scale = useSharedValue(1);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ConstellationGroup
        seed={seed}
        constellationId={cId}
        entries={sorted}
        startYear={startYear}
        view={view}
        canvasWidth={width}
        canvasHeight={height}
        scale={scale}
      />
    </View>
  );
}
