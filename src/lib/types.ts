/** Entry shape returned by GET /entries/current (List<JournalEntryResponse>). */
export type BackendEntry = {
  entryDate: string;
  mood: string;
  entryIndex?: number;
};

/** Response body from POST /journal. */
export type CreateJournalNoteResponse = {
  id: string;
  createdAt: string;
};
