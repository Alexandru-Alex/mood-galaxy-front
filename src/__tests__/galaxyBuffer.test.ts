import { getMonthsInBuffer } from '@/lib/galaxyBuffer';
import type { Entry } from '@/lib/entries';

type GalaxyPos = { angle: number; radius: number; cx: number; cy: number };

const W = 390;
const H = 844;

function makePositions(items: Array<{ cId: string; cx: number; cy: number }>): Map<string, GalaxyPos> {
  return new Map(items.map(({ cId, cx, cy }) => [cId, { angle: 0, radius: 0, cx, cy }]));
}

function makeGroups(items: Array<{ cId: string; date: string }>): Map<string, Entry[]> {
  return new Map(items.map(({ cId, date }) => [cId, [{ entryIndex: -1, date, mood: 'NEUTRAL' as const }]]));
}

describe('getMonthsInBuffer', () => {
  it('returns months for constellations inside the prefetch buffer', () => {
    const positions = makePositions([{ cId: 'c0', cx: 0, cy: 0 }]);
    const groups = makeGroups([{ cId: 'c0', date: '2024-01-01' }]);
    const months = getMonthsInBuffer(positions, groups, 0, 0, 1, W, H);
    expect(months).toContain('2024-01');
  });

  it('excludes constellations far outside the buffer', () => {
    const positions = makePositions([{ cId: 'c0', cx: 10000, cy: 0 }]);
    const groups = makeGroups([{ cId: 'c0', date: '2024-01-01' }]);
    const months = getMonthsInBuffer(positions, groups, 0, 0, 1, W, H);
    expect(months).not.toContain('2024-01');
  });

  it('deduplicates months when multiple constellations share a month', () => {
    const positions = makePositions([
      { cId: 'c0', cx: 0, cy: 0 },
      { cId: 'c1', cx: 10, cy: 10 },
    ]);
    const groups = makeGroups([
      { cId: 'c0', date: '2024-01-01' },
      { cId: 'c1', date: '2024-01-15' },
    ]);
    const months = getMonthsInBuffer(positions, groups, 0, 0, 1, W, H);
    expect(months.filter((m) => m === '2024-01')).toHaveLength(1);
  });

  it('skips constellations with no entries', () => {
    const positions = makePositions([{ cId: 'c0', cx: 0, cy: 0 }]);
    const groups: Map<string, Entry[]> = new Map([['c0', []]]);
    const months = getMonthsInBuffer(positions, groups, 0, 0, 1, W, H);
    expect(months).toHaveLength(0);
  });
});
