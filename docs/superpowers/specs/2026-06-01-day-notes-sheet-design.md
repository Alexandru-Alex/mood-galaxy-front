# Design: Day Notes Sheet & Journal Tab

**Date:** 2026-06-01  
**Status:** Approved

## Overview

Two related features that share a central component (`DayNotesSheet`):

1. **Dashboard star tap** — tap a filled star to see all notes from that day
2. **Journal tab** — new bottom nav tab showing all historical notes grouped by day

---

## Architecture

```
Dashboard
  └── FilledStar (onPress) ──┐
                              ├──→ DayNotesSheet(date)
Journal Tab                   │
  └── tap on day entry ───────┘
        │
        └── GET /entries/{date} → JournalNoteResponse[]
```

### New pieces
- **`DayNotesSheet`** — reusable bottom sheet, receives a date, fetches and displays notes
- **`src/app/journal.tsx`** — new Expo Router screen (Journal tab)
- **`fetchEntriesByDate(date)`** — new API call in `entries.ts`
- **`fetchAllEntries()`** — new API call in `entries.ts` (requires new backend endpoint)
- **`JournalNoteResponse`** — new type in `types.ts`

### Modified pieces
- **`constellation-group.tsx`** — `FilledStar` gets optional `onPress` prop; `ConstellationCanvas` gets optional `onStarPress(date)` prop; `pointerEvents` becomes conditional
- **`dashboard.tsx`** — manages `selectedDate` state, passes `onStarPress`, renders `DayNotesSheet`

---

## Section 1: Data Layer

### New type in `src/lib/types.ts`

```typescript
type JournalNoteResponse = {
  id: string;
  mood: Mood;
  content: string | null;
  createdAt: string; // ISO OffsetDateTime
};
```

### New functions in `src/lib/entries.ts`

```typescript
// Notes for a specific day
fetchEntriesByDate(date: string): Promise<JournalNoteResponse[]>
// GET /entries/{date}

// All entries (for Journal tab)
fetchAllEntries(): Promise<JournalNoteResponse[]>
// GET /entries
```

Sorting: client-side by `createdAt` ascending (chronological) for `DayNotesSheet`; newest-first grouping for Journal tab.

---

## Section 2: Dashboard Tap Flow

### `constellation-group.tsx` changes

- `FilledStar` receives `onPress?: () => void` — absent means no change in behavior
- `ConstellationCanvas` receives `onStarPress?: (date: string) => void` — when present, the `<Svg>` wrapper drops `pointerEvents="none"` and each `FilledStar` gets a press handler
- Galaxy view passes no `onStarPress` → stars remain non-interactive there

### `dashboard.tsx` changes

```typescript
const [selectedDate, setSelectedDate] = useState<string | null>(null)
// pass onStarPress={setSelectedDate} to ConstellationCanvas
// render <DayNotesSheet date={selectedDate} onClose={() => setSelectedDate(null)} />
```

### `DayNotesSheet` component

- Same animation pattern as `JournalSheet` (spring from bottom, backdrop tap closes)
- **Header:** formatted date (e.g. "Luni, 26 mai 2026")
- **Loading state:** spinner while fetching
- **Note item:**
  - Colored circle (mood color from existing color map)
  - Mood label + time (HH:mm from `createdAt`)
  - `content` text below (if present — field is optional)
- **Empty state:** "Nicio notă pentru această zi" (safety net)
- Notes ordered by `createdAt` ascending

---

## Section 3: Journal Tab

### Route

- File: `src/app/journal.tsx`
- Added to bottom nav between galaxy and the third button
- Icon: consistent with app style (e.g. ✦ or ☰)

### Screen layout

- Scrollable list, grouped by day, newest first
- Group header: formatted date
- Each item under header: same design as `DayNotesSheet` note item (mood circle + time + content)
- Tap any item → opens `DayNotesSheet` for that date (component reuse)
- Empty state if no entries exist

### Backend dependency

Requires `GET /entries` endpoint returning `JournalNoteResponse[]` (all entries, or paginated).  
Client groups by `date(createdAt)` into `Map<string, JournalNoteResponse[]>`.

---

## Out of Scope

- Star tap in galaxy view (stars remain non-interactive there)
- Edit or delete notes from `DayNotesSheet`
- Filtering or search in Journal tab
- Calendar view (YAGNI)
