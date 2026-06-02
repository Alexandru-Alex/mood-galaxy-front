# Journal Infinite Scroll & Redesign

**Date:** 2026-06-02
**Screen:** `src/app/(tabs)/journal.tsx` (native tabs only)

## Problem

The journal screen loads all entries in a single request and displays them as a plain dated list. Two issues:
1. Only the first page is shown (backend paginates but client ignores it)
2. The UI is not user-friendly — a long flat list with no visual hierarchy

## Goals

- Load entries page by page as the user scrolls down
- Redesign the list to be compact, mood-colored, and easy to scan
- Add a calendar so users can jump directly to a specific date

---

## Data Layer

### API

`GET /notes?page={page}&size=20`

Backend already supports this. Response shape (`PageResponse<JournalNoteResponse>`):

```ts
type PageResponse<T> = {
  content: T[];
  totalPages: number;
  last: boolean;      // true when no more pages
  number: number;     // current page (0-indexed)
};
```

### New fetch function

Add to `src/lib/entries.ts`:

```ts
export async function fetchNotesPage(page: number): Promise<PageResponse<JournalNoteResponse>> {
  return api.get<PageResponse<JournalNoteResponse>>(`/notes?page=${page}&size=20`);
}
```

`fetchAllEntries` is preserved for backwards compatibility.

### Infinite Query

Replace `useQuery` with `useInfiniteQuery` in `journal.tsx`:

```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['notes'],
  queryFn: ({ pageParam = 0 }) => fetchNotesPage(pageParam),
  getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.number + 1,
});
```

Flatten and group entries with `useMemo`:

```ts
const allNotes = useMemo(
  () => data?.pages.flatMap(p => p.content) ?? [],
  [data]
);
// then group allNotes by date into SectionList sections
```

Query invalidation on new entry creation remains unchanged (`queryKey: ['notes']`).

---

## UI

### List — SectionList

Replace `ScrollView` with `SectionList`. Each section = one calendar day.

**Section header:** date label (relative: "Azi", "Ieri", otherwise "DD MMM") + entry count on the right.

**Row (`JournalEntryRow`):** mood badge (emoji + label, semi-transparent background in mood color) | preview text truncated to 1 line | time on the right.

**Footer:** `ActivityIndicator` while `isFetchingNextPage`, nothing when all pages loaded.

**Infinite scroll trigger:** `onEndReached` with `onEndReachedThreshold={0.3}` calls `fetchNextPage()` when `hasNextPage && !isFetchingNextPage`.

### Mood colors

| Mood | Color |
|------|-------|
| JOYFUL | `#f59e0b` |
| CALM | `#3b82f6` |
| NEUTRAL | `#8b5cf6` |
| ANXIOUS | `#ef4444` |
| SAD | `#6b7280` |
| ANGRY | `#dc2626` |

### Calendar — Bottom Sheet

A 📅 icon in the screen header opens `JournalCalendarSheet`.

The sheet contains a full monthly calendar:
- Month navigation (‹ prev / next ›)
- Days with at least one entry marked with a violet dot
- Selected day highlighted

On date tap:
1. Sheet closes
2. If the date is already in the loaded sections → `sectionListRef.scrollToLocation({ sectionIndex, itemIndex: 0, animated: true })`
3. If the date is not yet loaded (not yet reached by pagination) → open the existing `DayNotesSheet` for that date directly (it already fetches by date via `fetchEntriesByDate`)

---

## Components

### New files

| File | Purpose |
|------|---------|
| `src/components/journal-entry-row.tsx` | Compact mood row — badge, preview, time |
| `src/components/journal-calendar-sheet.tsx` | Monthly calendar bottom sheet, emits `onDateSelect(date: string)` |

### Modified files

| File | Change |
|------|--------|
| `src/lib/entries.ts` | Add `fetchNotesPage(page)` |
| `src/app/(tabs)/journal.tsx` | `useInfiniteQuery` + `SectionList` + calendar trigger |

### No new dependencies

`useInfiniteQuery` is already available via the installed React Query version. The bottom sheet follows the existing `DayNotesSheet` pattern.

---

## Error Handling

- Network error on `fetchNextPage`: React Query retries automatically; no extra handling needed
- `fetchEntriesByDate` failure (calendar jump to unloaded date): `DayNotesSheet` handles its own error state
- Empty state (no entries at all): existing empty state UI is preserved

---

## Out of Scope

- Web screen (`src/app/journal.tsx`) — not touched
- Calendar heatmap / mood analytics
- Filtering by mood
