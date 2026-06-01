# Constellation Completion Aura

**Date:** 2026-06-01
**Status:** Approved

## Goal

When all 7 stars in a constellation are filled, render a soft radial gradient aura behind the constellation. The aura color is a weighted RGB blend of the mood colors of the 7 entries — the dominant mood contributes the most to the final color. The aura fades in smoothly over ~1.5 seconds.

## Trigger

`isComplete = entries.length >= MAX_SLOTS` (MAX_SLOTS = 7). Aura renders only when the constellation is complete.

## Visual Spec

- **Shape:** Single SVG `<circle>` with a `<radialGradient>` fill — blended color at center fading to transparent at the edge.
- **Size:** Radius ≈ 1.4 × SLOT_RADIUS (= ~168 px at current SLOT_RADIUS = 120). Large enough to bleed past the outermost stars.
- **Center:** Same screen-space center as the constellation (computed from `getConstellationCenter` + `starScreenPosition` logic, i.e. `view.centerX + cos(center.angle) * center.radius`, `view.centerY + sin(center.angle) * center.radius`).
- **Gradient:** `radialGradient` — blended color at opacity ~0.45 in the center, 0 at the edge.
- **Z-order:** Aura renders below the polylines and stars (first child in the SVG).
- **Animation:** Reanimated `withTiming(1, { duration: 1500 })` on the opacity shared value. Fades in once on mount when `isComplete` is true; no loop.

## Color Blending

Pure function `blendMoodColors(entries: Entry[]): string`:

1. Count occurrences of each mood in `entries`.
2. For each mood, look up its hex color in `MoodColors`.
3. Convert each hex to `{ r, g, b }`.
4. Compute weighted average: `R = Σ(count_i / total × r_i)` for each channel.
5. Round and convert back to `#rrggbb`.

Example: 5× JOYFUL (#EF9F27) + 1× CALM (#4FB286) + 1× NEUTRAL (#8B93B5):
- R = (5×239 + 1×79 + 1×139) / 7 ≈ 199 → `#c7`
- G = (5×159 + 1×178 + 1×147) / 7 ≈ 161 → `#a1`
- B = (5×39  + 1×134 + 1×181) / 7 ≈ 73  → `#49`
- Result: `#c7a149` — warm amber, JOYFUL-dominant ✓

## Architecture

### `src/lib/galaxyPositioning.ts`

Add:
```ts
export function blendMoodColors(entries: Entry[]): string
```

Takes `Entry[]`, returns a hex color string. Pure function — no side effects. Importing `MoodColors` and `Mood` from `@/constants/theme` and `Entry` from `constellation-canvas` would create a circular dependency, so instead accept a `Record<string, string>` color map as a second parameter:

```ts
export function blendMoodColors(
  entries: { mood: string }[],
  colorMap: Record<string, string>,
): string
```

Callers pass `MoodColors`. This keeps `galaxyPositioning.ts` free of UI dependencies.

### `src/components/constellation-canvas.tsx`

Add internal component:
```tsx
function ConstellationAura({ cx, cy, color, radius }: {
  cx: number; cy: number; color: string; radius: number;
})
```

Uses `useSharedValue(0)` + `useEffect` to animate opacity to 1 on mount via `withTiming(1, { duration: 1500 })`. Uses `useAnimatedProps` from Reanimated to animate the SVG circle's `fillOpacity`.

In `ConstellationCanvas`, compute:
```ts
const isComplete = sorted.length >= MAX_SLOTS;
const auraCx = view.centerX + Math.cos(center.angle) * center.radius * view.zoom;
const auraCy = view.centerY + Math.sin(center.angle) * center.radius * view.zoom;
const auraColor = isComplete ? blendMoodColors(sorted, MoodColors) : '#000000';
const auraRadius = SLOT_RADIUS * 1.4;
```

Render inside `<Svg>` as the first child (below everything else):
```tsx
{isComplete && (
  <ConstellationAura cx={auraCx} cy={auraCy} color={auraColor} radius={auraRadius} />
)}
```

## No-change areas

- `MoodPicker` — unchanged
- `FilledStar` / `GhostStar` — unchanged
- `dashboard.tsx`, `galaxy.tsx` — no changes needed (pass-through via `entries` prop)

## Files Modified

| File | Change |
|------|--------|
| `src/lib/galaxyPositioning.ts` | Add `blendMoodColors` |
| `src/components/constellation-canvas.tsx` | Add `ConstellationAura`, render it conditionally |
