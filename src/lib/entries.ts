import type { Mood } from '@/constants/theme';
import type { BackendEntry, JournalNoteResponse, PageResponse } from '@/lib/types';
import { api } from '@/lib/api';

export type Entry = { entryIndex: number; date: string; mood: Mood };

export function toEntries(data: BackendEntry[]): Entry[] {
  const sorted = [...data].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  return sorted.map((item, i) => ({
    entryIndex: item.entryIndex ?? i,
    date: item.entryDate,
    mood: (item.mood as Mood) || 'NEUTRAL',
  }));
}

export async function fetchEntriesByDate(date: string): Promise<JournalNoteResponse[]> {
  if (!date) return [];
  const data = await api.get<JournalNoteResponse[]>(`/entries/${date}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchAllEntries(): Promise<JournalNoteResponse[]> {
  const data = await api.get<PageResponse<JournalNoteResponse>>('/notes');
  if (Array.isArray(data?.content)) return data.content;
  console.warn('[fetchAllEntries] unexpected response shape', data);
  return [];
}

export async function fetchMonthSummary(): Promise<import('./types').MonthSummary[]> {
  const data = await api.get<import('./types').MonthSummary[]>('/entries/months');
  return Array.isArray(data) ? data : [];
}

export async function fetchEntriesByMonth(month: string): Promise<Entry[]> {
  const data = await api.get<BackendEntry[]>(`/entries/by-month/${month}`);
  if (!Array.isArray(data)) return [];
  return toEntries(data);
}
