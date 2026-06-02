import type { Entry } from '@/lib/entries';

const PREFETCH_MARGIN = 800;

type CullState = { tx: number; ty: number; s: number };
type GalaxyPos = { angle: number; radius: number; cx: number; cy: number };

function isInBuffer(
  cx: number,
  cy: number,
  { tx, ty, s }: CullState,
  width: number,
  height: number,
): boolean {
  const screenX = cx * s + width / 2 + tx;
  const screenY = cy * s + height / 2 + ty;
  return (
    screenX > -PREFETCH_MARGIN &&
    screenX < width + PREFETCH_MARGIN &&
    screenY > -PREFETCH_MARGIN &&
    screenY < height + PREFETCH_MARGIN
  );
}

export function getMonthsInBuffer(
  positions: Map<string, GalaxyPos>,
  groups: Map<string, Entry[]>,
  tx: number,
  ty: number,
  s: number,
  width: number,
  height: number,
): string[] {
  const seen = new Set<string>();
  for (const [cId, pos] of positions) {
    if (!isInBuffer(pos.cx, pos.cy, { tx, ty, s }, width, height)) continue;
    const entries = groups.get(cId);
    if (!entries?.[0]) continue;
    seen.add(entries[0].date.slice(0, 7));
  }
  return [...seen];
}
