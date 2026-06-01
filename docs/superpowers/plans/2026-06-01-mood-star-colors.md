# Mood Star Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Color each filled constellation star with its logged mood's brand color.

**Architecture:** Add `Mood` type and `MoodColors` map to `theme.ts`, re-export `Mood` from `mood-picker.tsx` for backwards compat, then thread a `mood` prop through `ConstellationCanvas` → `FilledStar` so each star's halo and core render in the mood's color.

**Tech Stack:** React Native, TypeScript, `react-native-reanimated` (Animated.View for stars)

---

## File Map

| File | Change |
|------|--------|
| `src/constants/theme.ts` | Add `Mood` type + `MoodColors` record |
| `src/components/mood-picker.tsx` | Remove local `Mood` definition; re-export from theme |
| `src/components/constellation-canvas.tsx` | `FilledStar` gains `mood` prop; `ConstellationCanvas` builds slot→mood map and passes it down |

---

### Task 1: Add `Mood` type and `MoodColors` to `theme.ts`

**Files:**
- Modify: `src/constants/theme.ts`

- [ ] **Step 1: Add Mood type and MoodColors after the Palette block**

Open `src/constants/theme.ts`. After the closing `} as const;` of `Palette` (around line 26), insert:

```ts
export type Mood = 'JOYFUL' | 'CALM' | 'NEUTRAL' | 'ANXIOUS' | 'SAD' | 'ANGRY';

export const MoodColors: Record<Mood, string> = {
  JOYFUL:  '#EF9F27',
  CALM:    '#4FB286',
  NEUTRAL: '#8B93B5',
  ANXIOUS: '#7F77DD',
  SAD:     '#378ADD',
  ANGRY:   '#D85A30',
} as const;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/constants/theme.ts
git commit -m "feat: add Mood type and MoodColors to theme"
```

---

### Task 2: Re-export `Mood` from `mood-picker.tsx`

**Files:**
- Modify: `src/components/mood-picker.tsx`

`mood-picker.tsx` currently defines its own `Mood` type. Components importing it from here (`auth-modal.tsx`, any others) must continue to work unchanged.

- [ ] **Step 1: Replace the local type definition with a re-export**

In `src/components/mood-picker.tsx`, find and replace:

```ts
export type Mood = 'JOYFUL' | 'CALM' | 'NEUTRAL' | 'ANXIOUS' | 'SAD' | 'ANGRY';
```

with:

```ts
export type { Mood } from '@/constants/theme';
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors. All existing importers of `Mood` from `mood-picker.tsx` continue to resolve correctly because of the re-export.

- [ ] **Step 3: Commit**

```bash
git add src/components/mood-picker.tsx
git commit -m "refactor: re-export Mood from theme instead of redefining it"
```

---

### Task 3: Color filled stars by mood in `constellation-canvas.tsx`

**Files:**
- Modify: `src/components/constellation-canvas.tsx`

Currently `FilledStar` is:
```tsx
function FilledStar({ x, y }: Point) { ... }
```
It uses `Palette.brightLavender` for the halo background (in `StyleSheet`) and `'#ffffff'` for the core. Both need to become per-instance dynamic values driven by `MoodColors[mood]`.

- [ ] **Step 1: Update imports**

At the top of `src/components/constellation-canvas.tsx`, add `Mood` and `MoodColors` to the theme import:

```ts
import { MoodColors, Palette } from '@/constants/theme';
import type { Mood } from '@/constants/theme';
```

Remove `Palette` from the import if it is no longer used after this task (it's still used for `brightLavender` on `GhostStar` and the polyline strokes, so keep it).

- [ ] **Step 2: Add `mood` prop to `FilledStar` and use dynamic colors**

Replace the entire `FilledStar` function with:

```tsx
function FilledStar({ x, y, mood }: Point & { mood: Mood }) {
  const color = MoodColors[mood];
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.starWrap, { left: x - HALO / 2, top: y - HALO / 2 }, style]}>
      <View style={[styles.halo, { backgroundColor: color }]} />
      <View style={[styles.core, { backgroundColor: color }]} />
    </Animated.View>
  );
}
```

- [ ] **Step 3: Remove static colors from the `halo` and `core` StyleSheet entries**

In the `StyleSheet.create` block at the bottom of the file, update `halo` and `core`:

```ts
halo: {
  position: 'absolute',
  top: 0,
  left: 0,
  width: HALO,
  height: HALO,
  borderRadius: HALO / 2,
  opacity: 0.25,
  // backgroundColor applied inline per mood
},
core: {
  width: CORE,
  height: CORE,
  borderRadius: CORE / 2,
  // backgroundColor applied inline per mood
},
```

- [ ] **Step 4: Build a slot→mood map in `ConstellationCanvas` and pass mood to `FilledStar`**

Inside the `ConstellationCanvas` function, after the `filledSlots` line, add:

```tsx
const slotMoodMap = new Map(
  sorted.map((e) => [slotForEntry(e.entryIndex), e.mood as Mood]),
);
```

Then update the `FilledStar` render (the second `allPositions.map`) to pass `mood`:

```tsx
{allPositions.map((p, i) =>
  filledSlots.has(i) ? (
    <FilledStar key={`f-${i}`} x={p.x} y={p.y} mood={slotMoodMap.get(i)!} />
  ) : null,
)}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Visual check**

Run the app (`npx expo start`) and navigate to the dashboard. Each filled star should glow in its mood's color. Ghost stars (empty slots) remain in `brightLavender`. The `galaxy.tsx` screen also uses `ConstellationCanvas` with mock entries covering all six moods — confirm all six colors appear there.

- [ ] **Step 7: Commit**

```bash
git add src/components/constellation-canvas.tsx
git commit -m "feat: color filled stars by mood using MoodColors"
```
