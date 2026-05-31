# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard screen to show date/greeting, constellation progress, a mascot at the next star, a persistent pill CTA, and a mock bottom nav.

**Architecture:** All changes are in `src/app/dashboard.tsx`. The top HUD row becomes a left/right split. The mascot position is computed directly in the dashboard using the same `galaxyPositioning` functions already used by `ConstellationCanvas` (Approach A — duplication of the ~5-line position calculation rather than adding callback coupling). A new `GET /accounts` fetch runs in parallel with the existing entries fetch to get `displayName`.

**Tech Stack:** React Native, Expo SDK 56, `expo-image` (already installed), `react-native-svg` (already installed), `@expo/vector-icons` (needs install).

---

### Task 1: Install icon library and add pure helper functions

**Files:**
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Install `@expo/vector-icons`**

```bash
npx expo install @expo/vector-icons
```

Expected: package added to `node_modules`, no errors.

- [ ] **Step 2: Add helper functions at the top of `dashboard.tsx` (before the component)**

Add these two pure functions after the imports block, before the `FALLBACK_SEED` constant:

```ts
function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getGreeting(displayName: string | null): string {
  const hour = new Date().getHours();
  let salutation: string;
  if (hour >= 5 && hour < 12) salutation = 'Good morning';
  else if (hour >= 12 && hour < 18) salutation = 'Good afternoon';
  else if (hour >= 18 && hour < 22) salutation = 'Good evening';
  else salutation = 'Good night';
  return displayName ? `${salutation}, ${displayName}` : salutation;
}
```

- [ ] **Step 3: Verify the app still starts**

Run: `npx expo start`
Expected: Metro bundler starts, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard.tsx package.json package-lock.json
git commit -m "feat: install vector-icons, add date/greeting helpers"
```

---

### Task 2: Fetch account and store displayName

**Files:**
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Add `AccountDto` type and `displayName` state**

At the top of `dashboard.tsx`, after the existing imports, add:

```ts
type AccountDto = {
  id: string;
  email: string;
  displayName: string;
  isNotification: boolean;
};
```

Inside `DashboardScreen`, add this state after the existing state declarations:

```ts
const [displayName, setDisplayName] = useState<string | null>(null);
```

- [ ] **Step 2: Fetch `/accounts` in parallel with existing entries fetch**

Replace the existing `useEffect` body with:

```ts
useEffect(() => {
  getStoredSeed()
    .then((s) => { if (s !== null) setSeed(s); })
    .catch(console.error);

  api.get<{ entries: Entry[]; startYear: number }>('/entries/current')
    .then((data) => {
      setEntries(data.entries);
      setStartYear(data.startYear);
    })
    .catch(console.error);

  api.get<AccountDto>('/accounts')
    .then((data) => setDisplayName(data.displayName))
    .catch(console.error);
}, []);
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx expo start`
Expected: bundler starts cleanly; in dev, the `/accounts` call will fail (no server) but `displayName` stays `null` and the greeting shows without a name — that's correct fallback behaviour.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard.tsx
git commit -m "feat: fetch displayName from GET /accounts"
```

---

### Task 3: Restructure top HUD row — date, greeting, progress

**Files:**
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Replace the `hudTop` View and its children**

Find this block in the JSX:

```tsx
<View style={styles.hudTop} pointerEvents="none">
  <Text style={styles.counter}>{entries.length} / {MAX_SLOTS}</Text>
  <Text style={styles.hint}>
    {entries.length >= MAX_SLOTS ? 'Constellation complete ✦' : 'Add your mood for today'}
  </Text>
</View>
```

Replace it with:

```tsx
<View style={styles.topRow} pointerEvents="none">
  <View>
    <Text style={styles.dateText}>{getFormattedDate()}</Text>
    <Text style={styles.greetingText}>{getGreeting(displayName)}</Text>
  </View>
  <Text style={styles.progressText}>
    {entries.length >= MAX_SLOTS ? 'Constellation complete ✦' : `${entries.length} / ${MAX_SLOTS} ★`}
  </Text>
</View>
```

- [ ] **Step 2: Replace the old styles with new ones**

In `StyleSheet.create({...})`, remove `hudTop`, `counter`, and `hint`. Add these:

```ts
topRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  width: '100%',
},
dateText: {
  fontSize: 13,
  fontWeight: '600',
  color: Palette.brightLavender,
  letterSpacing: 0.3,
},
greetingText: {
  fontSize: 18,
  fontWeight: '800',
  color: '#ffffff',
  marginTop: 2,
},
progressText: {
  fontSize: 14,
  fontWeight: '700',
  color: Palette.mauve,
  letterSpacing: 0.5,
  textAlign: 'right',
},
```

- [ ] **Step 3: Verify visually in simulator/Expo Go**

Expected: top row shows date on the left (small, lavender), greeting below it (white, bold), and progress/complete on the right (mauve).

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard.tsx
git commit -m "feat: restructure dashboard top row with date, greeting, progress"
```

---

### Task 4: Mascot positioned at next unfilled star

**Files:**
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Add the missing imports**

At the top of `dashboard.tsx`, add to the existing `@/lib/galaxyPositioning` import (or add a new one if not yet imported):

```ts
import {
  constellationIdForEntry,
  generateConstellationShape,
  getConstellationCenter,
  starScreenPosition,
  type Point,
  type View as GalaxyView,
} from '@/lib/galaxyPositioning';
import { AstronautLanding } from '@/components/astronaut-landing';
```

- [ ] **Step 2: Define `SLOT_RADIUS` constant alongside the other constants**

After `const MAX_SLOTS = 7;`, add:

```ts
const SLOT_RADIUS = 120;
```

- [ ] **Step 3: Compute `mascotPos` inside the component**

Inside `DashboardScreen`, after the state declarations and before `return`, add:

```ts
const sorted = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
const cId = sorted.length > 0 ? constellationIdForEntry(sorted[0].entryIndex) : 'c0';
const centerDate = sorted.length > 0 ? sorted[0].date : new Date().toISOString().slice(0, 10);
const view: GalaxyView = { centerX: width / 2, centerY: height / 2, zoom: 1 };
const center = getConstellationCenter(centerDate, startYear);
const shape = generateConstellationShape(seed, cId);
const allPositions: Point[] = shape.map((p) => starScreenPosition(center, p, view, SLOT_RADIUS));
const mascotPos: Point | null = entries.length < MAX_SLOTS ? allPositions[entries.length] : null;
```

- [ ] **Step 4: Render the mascot inside the HUD, after the `topRow` and before the `bottomArea`**

```tsx
{mascotPos && (
  <View
    style={{ position: 'absolute', left: mascotPos.x - 30, top: mascotPos.y - 60 }}
    pointerEvents="none"
  >
    <AstronautLanding width={60} height={52} />
  </View>
)}
```

- [ ] **Step 5: Verify visually**

Expected: astronaut image hovers just above the next ghost star. At 4/7 filled, it sits above star 5. At 7/7, no mascot shown.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard.tsx
git commit -m "feat: mascot positioned at next unfilled constellation star"
```

---

### Task 5: Pill CTA button — always visible, MAX_SLOTS gate removed

**Files:**
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Update `canAdd`**

Find:
```ts
const canAdd = entries.length < MAX_SLOTS && !submitting;
```

Replace with:
```ts
const canAdd = !submitting;
```

- [ ] **Step 2: Replace the add button JSX**

Find this block:
```tsx
{canAdd && (
  <Pressable
    style={styles.addBtn}
    onPress={() => setPickerVisible((v) => !v)}>
    <Text style={styles.addBtnText}>+</Text>
  </Pressable>
)}
```

Replace with (button is always rendered, just disabled while submitting):
```tsx
<Pressable
  style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
  onPress={() => canAdd && setPickerVisible((v) => !v)}>
  <Text style={styles.addBtnText}>+ Cum te simți</Text>
</Pressable>
```

- [ ] **Step 3: Replace button styles**

Remove old `addBtn` and `addBtnText` styles. Add:

```ts
addBtn: {
  paddingVertical: 14,
  paddingHorizontal: 32,
  borderRadius: 32,
  backgroundColor: 'rgba(87, 74, 226, 0.85)',
  borderWidth: 1,
  borderColor: Palette.brightLavender,
  alignItems: 'center',
  justifyContent: 'center',
},
addBtnDisabled: {
  opacity: 0.45,
},
addBtnText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#ffffff',
  letterSpacing: 0.3,
},
```

- [ ] **Step 4: Verify visually**

Expected: pill-shaped button always visible at the bottom, labelled "+ Cum te simți". Tapping opens the mood picker. While `submitting` is true it appears dimmed.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard.tsx
git commit -m "feat: pill CTA button always visible, remove MAX_SLOTS gate"
```

---

### Task 6: Mock bottom navigation bar

**Files:**
- Modify: `src/app/dashboard.tsx`

- [ ] **Step 1: Add Ionicons import**

```ts
import { Ionicons } from '@expo/vector-icons';
```

- [ ] **Step 2: Add bottom nav JSX below the CTA button, inside `bottomArea`**

The `bottomArea` View currently contains `<MoodPicker>` and the `<Pressable>` button. Add the nav below the button:

```tsx
<View style={styles.bottomNav}>
  <Pressable style={styles.navItem}>
    <Ionicons name="home" size={24} color={Palette.mauve} />
  </Pressable>
  <Pressable style={styles.navItem}>
    <Ionicons name="planet-outline" size={24} color={Palette.brightLavender} />
  </Pressable>
  <Pressable style={styles.navItem}>
    <Ionicons name="person-outline" size={24} color={Palette.brightLavender} />
  </Pressable>
</View>
```

- [ ] **Step 3: Add nav styles**

```ts
bottomNav: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  width: '100%',
  paddingHorizontal: Spacing.four,
  marginTop: Spacing.two,
},
navItem: {
  padding: Spacing.two,
},
```

- [ ] **Step 4: Verify visually**

Expected: three icons in a row below the CTA button — home (mauve/active), planet (lavender), person (lavender). No navigation on tap — mock only.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard.tsx
git commit -m "feat: mock bottom navigation bar with home, galaxy, profile icons"
```
