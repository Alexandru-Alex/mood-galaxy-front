import type { Mood } from '@/constants/theme';

/** Entry shape returned by GET /entries (content items in PageResponse). */
export type BackendEntry = {
  entryDate: string;
  mood: string;
  entryIndex?: number;
};

/** Paginated wrapper returned by GET /entries?page=N&size=N. */
export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  last: boolean;
  number: number;
};

/** Response body from POST /journal. */
export type CreateJournalNoteResponse = {
  id: string;
  createdAt: string;
};

/** Response body from GET /entries/{date} and GET /entries. */
export type JournalNoteResponse = {
  id: string;
  mood: Mood;
  content: string | null;
  createdAt: string;
};
