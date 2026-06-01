export type BackendEntry = {
  entryDate: string;
  mood: string;
  entryIndex?: number;
};

export type CreateJournalNoteResponse = {
  id: string;
  createdAt: string;
};
