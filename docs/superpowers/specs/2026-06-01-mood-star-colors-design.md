# Mood Star Colors

**Date:** 2026-06-01
**Status:** Approved

## Goal

Each filled star in the constellation canvas reflects the mood it was logged for, using a distinct color per mood type.

## Color Map

| Mood    | Hex       |
|---------|-----------|
| JOYFUL  | `#EF9F27` |
| CALM    | `#4FB286` |
| NEUTRAL | `#8B93B5` |
| ANXIOUS | `#7F77DD` |
| SAD     | `#378ADD` |
| ANGRY   | `#D85A30` |

## Scope

Stars only. The MoodPicker and constellation lines are not changed.

## Architecture

### 1 — Shared `Mood` type

`Mood` is currently defined in `src/components/mood-picker.tsx`. Move it to `src/constants/theme.ts` so `MoodColors` can be keyed on it without a circular import. Re-export `Mood` from `mood-picker.tsx` for backwards compatibility.

### 2 — `MoodColors` token

Add to `theme.ts`:

```ts
export const MoodColors: Record<Mood, string> = {
  JOYFUL:  '#EF9F27',
  CALM:    '#4FB286',
  NEUTRAL: '#8B93B5',
  ANXIOUS: '#7F77DD',
  SAD:     '#378ADD',
  ANGRY:   '#D85A30',
};
```

### 3 — `FilledStar` gains a `mood` prop

`FilledStar` in `constellation-canvas.tsx` currently uses hardcoded `Palette.brightLavender` for the halo and `#ffffff` for the core. Change it to accept `mood: Mood` and derive both colors from `MoodColors[mood]`:

- **halo** — `MoodColors[mood]` at 25% opacity (same as current halo treatment)
- **core** — `MoodColors[mood]` solid

### 4 — `ConstellationCanvas` passes mood down

Each `FilledStar` is rendered from an `Entry` which already carries `mood`. Pass `entry.mood` as the `mood` prop.

## Data Flow

```
Entry.mood (string)
  → ConstellationCanvas maps entries to FilledStar instances
  → FilledStar receives mood prop
  → MoodColors[mood] applied to halo + core styles
```

## No-change areas

- `GhostStar` — empty slots have no mood, stays `brightLavender`
- Constellation polylines — unchanged
- MoodPicker buttons — unchanged
