import type { Mood } from '@/constants/theme';
import type { BackendEntry } from '@/lib/types';

export type Entry = { entryIndex: number; date: string; mood: Mood };

export function toEntries(data: BackendEntry[]): Entry[] {
  const sorted = [...data].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  return sorted.map((item, i) => ({
    entryIndex: item.entryIndex ?? i,
    date: item.entryDate,
    mood: (item.mood as Mood) || 'NEUTRAL',
  }));
}
