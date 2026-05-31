// src/lib/galaxyPositioning.ts

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Point = { x: number; y: number };
export type ConstellationCenter = { angle: number; radius: number };
export type View = { centerX: number; centerY: number; zoom: number };

export function generateConstellationShape(
  galaxySeed: number,
  constellationId: string,
  pointCount = 7,
): Point[] {
  const rng = mulberry32(hashSeed(`${galaxySeed}:${constellationId}`));
  const points: Point[] = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2 + (rng() - 0.5) * 2.2;
    const radius = 0.15 + rng() * 0.85;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

export function constellationIdForEntry(entryIndex: number): string {
  return `c${Math.floor(entryIndex / 7)}`;
}

export function slotForEntry(entryIndex: number): number {
  return entryIndex % 7;
}

export function getConstellationCenter(
  date: string,
  startYear: number,
  { ringGap = 90, baseRadius = 40 }: { ringGap?: number; baseRadius?: number } = {},
): ConstellationCenter {
  const d = new Date(date);
  const monthFraction = (d.getUTCMonth() + d.getUTCDate() / 31) / 12;
  const angle = -Math.PI / 2 + monthFraction * Math.PI * 2;
  const yearIndex = Math.max(0, d.getUTCFullYear() - startYear);
  return { angle, radius: baseRadius + yearIndex * ringGap };
}

export function starScreenPosition(
  center: ConstellationCenter,
  shapePoint: Point,
  view: View,
  slotRadius = 28,
): Point {
  const cx = view.centerX + Math.cos(center.angle) * center.radius * view.zoom;
  const cy = view.centerY + Math.sin(center.angle) * center.radius * view.zoom;
  return {
    x: cx + shapePoint.x * slotRadius * view.zoom,
    y: cy + shapePoint.y * slotRadius * view.zoom,
  };
}
