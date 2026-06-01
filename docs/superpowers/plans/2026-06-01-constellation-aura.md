# Constellation Completion Aura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When all 7 stars are filled, render a radial-gradient aura behind the constellation whose color is a weighted RGB blend of the 7 mood colors, fading in over 1.5 s.

**Architecture:** Add a pure `blendMoodColors` function to `galaxyPositioning.ts` that accepts entries and a color map and returns a blended hex color. Add a `ConstellationAura` component inside `constellation-canvas.tsx` that renders an `Animated.View` containing a small `<Svg>` with a `RadialGradient` circle; the view's opacity animates from 0 → 1 via Reanimated `withTiming`. `ConstellationCanvas` computes the aura center, color, and completion flag, then renders the aura first (behind stars and lines).

**Tech Stack:** React Native, TypeScript, `react-native-svg` (RadialGradient, Circle), `react-native-reanimated` (useSharedValue, withTiming, useAnimatedStyle)

---

## File Map

| File | Change |
|------|--------|
| `src/lib/galaxyPositioning.ts` | Add `hexToRgb` helper + `blendMoodColors` export |
| `src/components/constellation-canvas.tsx` | Add SVG imports, `ConstellationAura` component, render aura conditionally in `ConstellationCanvas` |

---

### Task 1: Add `blendMoodColors` to `galaxyPositioning.ts`

**Files:**
- Modify: `src/lib/galaxyPositioning.ts`

- [ ] **Step 1: Add `hexToRgb` helper and `blendMoodColors` at the bottom of the file**

Append after the last export (`starScreenPosition`) in `src/lib/galaxyPositioning.ts`:

```ts
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/**
 * Returns a weighted-average hex color from entries, weighted by mood frequency.
 * colorMap maps mood string → hex color (e.g. MoodColors from theme).
 * Falls back to '#808080' for unknown moods.
 */
export function blendMoodColors(
  entries: { mood: string }[],
  colorMap: Record<string, string>,
): string {
  if (entries.length === 0) return '#ffffff';
  let r = 0, g = 0, b = 0;
  for (const entry of entries) {
    const hex = colorMap[entry.mood] ?? '#808080';
    const rgb = hexToRgb(hex);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;
  }
  const n = entries.length;
  const toHex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: only the pre-existing `welcome.tsx` error (`Palette.white`). No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/galaxyPositioning.ts
git commit -m "feat: add blendMoodColors to galaxyPositioning"
```

---

### Task 2: Add `ConstellationAura` to `constellation-canvas.tsx`

**Files:**
- Modify: `src/components/constellation-canvas.tsx`

#### Step 1: Update SVG import to include gradient and circle components

- [ ] Replace line 3 in `src/components/constellation-canvas.tsx`:

```ts
import Svg, { Polyline } from 'react-native-svg';
```

with:

```ts
import Svg, { Circle, Defs, Polyline, RadialGradient, Stop } from 'react-native-svg';
```

#### Step 2: Add `blendMoodColors` to the `galaxyPositioning` import

- [ ] In `src/components/constellation-canvas.tsx`, update the `galaxyPositioning` import (lines 12–20) to include `blendMoodColors`:

```ts
import {
  blendMoodColors,
  constellationIdForEntry,
  generateConstellationShape,
  getConstellationCenter,
  slotForEntry,
  starScreenPosition,
  type Point,
  type View as GalaxyView,
} from '@/lib/galaxyPositioning';
```

#### Step 3: Add `ConstellationAura` component

- [ ] Insert the `ConstellationAura` component after the `GhostStar` function (after line 58) and before the `type Props` block:

```tsx
const AURA_RADIUS = SLOT_RADIUS * 1.4;

function ConstellationAura({
  cx,
  cy,
  color,
  radius,
  width,
  height,
}: {
  cx: number;
  cy: number;
  color: string;
  radius: number;
  width: number;
  height: number;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="constellation-aura" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={radius} fill="url(#constellation-aura)" />
      </Svg>
    </Animated.View>
  );
}
```

#### Step 4: Compute aura values and render `ConstellationAura` in `ConstellationCanvas`

- [ ] Inside `ConstellationCanvas`, after the `const center = ...` line, add:

```ts
const isComplete = sorted.length >= 7;
const auraCx = view.centerX + Math.cos(center.angle) * center.radius * view.zoom;
const auraCy = view.centerY + Math.sin(center.angle) * center.radius * view.zoom;
const auraColor = isComplete ? blendMoodColors(sorted, MoodColors) : '#000000';
```

- [ ] Then update the `return` block to render `ConstellationAura` as the first child (before the `<Svg>`), so it sits behind all stars and lines:

```tsx
return (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {isComplete && (
      <ConstellationAura
        cx={auraCx}
        cy={auraCy}
        color={auraColor}
        radius={AURA_RADIUS}
        width={width}
        height={height}
      />
    )}
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Polyline
        points={ghostPoints}
        fill="none"
        stroke={Palette.brightLavender}
        strokeWidth={1}
        strokeOpacity={0.3}
        strokeDasharray="4 6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {filledPositions.length >= 2 && (
        <Polyline
          points={solidPoints}
          fill="none"
          stroke={Palette.brightLavender}
          strokeWidth={1}
          strokeOpacity={0.85}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </Svg>
    {allPositions.map((p, i) =>
      filledSlots.has(i) ? null : <GhostStar key={i} x={p.x} y={p.y} />,
    )}
    {allPositions.map((p, i) =>
      filledSlots.has(i) ? (
        <FilledStar key={`f-${i}`} x={p.x} y={p.y} mood={slotMoodMap.get(i) ?? 'NEUTRAL'} />
      ) : null,
    )}
  </View>
);
```

#### Step 5: Verify TypeScript

- [ ] Run:

```bash
npx tsc --noEmit
```

Expected: only the pre-existing `welcome.tsx` error. No new errors.

#### Step 6: Visual check

Run `npx expo start` and open the **galaxy** screen — it uses `MOCK_ENTRIES` which has all 7 slots filled (entryIndex 0–6). You should see a soft radial glow appear behind the constellation, fading in over ~1.5 seconds. The glow should be warm amber (JOYFUL-dominant: indices 0, 1, 5, 6 = JOYFUL/CALM/JOYFUL/CALM, index 2 = NEUTRAL, index 3 = SAD, index 4 = ANGRY — actual blend will vary).

On the **dashboard** screen with fewer than 7 entries, no aura should appear.

#### Step 7: Commit

- [ ] Run:

```bash
git add src/components/constellation-canvas.tsx
git commit -m "feat: add constellation completion aura with blended mood colors"
```
