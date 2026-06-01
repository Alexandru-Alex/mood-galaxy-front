# Journal Bottom Sheet

**Date:** 2026-06-01
**Status:** Approved

## Overview

Replace the current inline `MoodPicker` popup on the dashboard with a full-screen bottom sheet (`@gorhom/bottom-sheet`) that lets users pick a mood, write an optional thought, and submit a journal entry via `POST /journal`. On save the sheet dismisses and the new star pulses into view in the constellation.

## Component: `JournalSheet`

**File:** `src/components/journal-sheet.tsx`

**API surface:**
```ts
type JournalSheetProps = {
  ref: React.Ref<BottomSheetModal>;
  onSubmitSuccess: (entries: BackendEntry[]) => void;
};
```

`BackendEntry` (`{ entryDate: string; mood: string; entryIndex?: number }`) is extracted from `dashboard.tsx` into `src/lib/types.ts` and imported by both files.

**Internal state:**
- `mood: Mood | null` — resets to `null` each time the sheet opens
- `content: string` — resets to `''` each time the sheet opens
- `submitting: boolean`
- `error: string | null`

**Sheet configuration:**
- `snapPoints`: `['60%']` — single snap point, no expansion
- `enablePanDownToClose: true`
- `backdropComponent`: `BottomSheetBackdrop` with `appearsOnIndex=0`, `disappearsOnIndex=-1`, `opacity=0.6`, background color `#050410`
- `backgroundStyle`: `{ backgroundColor: '#1a1438' }`, `borderRadius: 24`
- `handleIndicatorStyle`: mauve `#e2adf2`

**Sheet layout (top → bottom):**
1. Title: "How are you feeling?" (white, 18px bold)
2. Subtitle: "Choose a mood, then write your thought" (brightLavender, 13px)
3. Section label: "MOOD"
4. Row of 6 color circles using `MoodColors` from `src/constants/theme.ts`:
   - JOYFUL `#EF9F27`, CALM `#4FB286`, NEUTRAL `#8B93B5`, ANXIOUS `#7F77DD`, SAD `#378ADD`, ANGRY `#D85A30`
   - Selected: white border (3px) + scale 1.1 via `withSpring`
   - Unselected: transparent border
   - Label below each circle (9px, brightLavender)
5. Section label: "THOUGHT (optional)"
6. `BottomSheetTextInput` — placeholder "Write your thought...", multiline, max 3 visible lines
7. Error text (red, 13px) — shown only when `error !== null`
8. "✦ Add the star" button — disabled + dimmed when `mood === null` or `submitting === true`; shows "Adding..." text while submitting

## API

```
POST /journal
Body: { mood: Mood, content: string }
```

On success:
1. `GET /entries/current` to fetch refreshed entries
2. Call `onSubmitSuccess(entries)`
3. `bottomSheetRef.current?.dismiss()`

On error: set `error` state with the error message, do not dismiss.

## Star Feedback Animation

When `onSubmitSuccess` fires, the dashboard updates `entries` state. To signal the new star, the dashboard tracks a `newEntryIndex: number | null` value set to the index of the just-added entry. A separate `Animated.View` (Reanimated) is positioned over the new star's screen coordinates (already computed via `starScreenPosition`), renders a glowing circle, and plays scale `1 → 1.8 → 1` + opacity `1 → 0` over 600ms using `withSequence` + `withSpring`, then clears `newEntryIndex`. `ConstellationCanvas` is not changed.

## Dashboard Changes

- Remove: `pickerVisible` state, `MoodPicker` import, the full-screen dismiss `Pressable`
- Add: `bottomSheetModalRef = useRef<BottomSheetModal>(null)`
- Button `onPress`: `bottomSheetModalRef.current?.present()`
- Add `<BottomSheetModalProvider>` wrapping the root `<View>` (or confirm it's already in `_layout.tsx`)
- Pass `onSubmitSuccess` to update `entries` + `startYear` state

## Files

| Action | File |
|--------|------|
| Create | `src/components/journal-sheet.tsx` |
| Create | `src/lib/types.ts` (shared `BackendEntry` type) |
| Modify | `src/app/dashboard.tsx` |
| Install | `@gorhom/bottom-sheet@^5` |

## Out of Scope

- `mood-picker.tsx` is kept but no longer used by the dashboard
- No changes to `ConstellationCanvas` internal rendering logic — only the pulse animation is added for the new star
- No backend changes
