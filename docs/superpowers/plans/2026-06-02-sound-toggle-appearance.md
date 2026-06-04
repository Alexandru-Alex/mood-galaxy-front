# Sound Toggle — Appearance Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sound toggle in a new "Appearance" card on the You screen that persists to the backend via `PATCH /accounts` and syncs with the existing `AudioContext`.

**Architecture:** Three surgical edits — extend the `AccountDto` type, expose a `setMuted` setter on `AudioContext`, then wire state + mutation + UI in the You screen. No new files needed; all changes follow existing patterns in the codebase.

**Tech Stack:** React Native, Expo Router, `@tanstack/react-query`, `expo-audio`, Ionicons

---

### Task 1: Add `sound` field to `AccountDto`

**Files:**
- Modify: `src/lib/query-keys.ts`

- [ ] **Step 1: Add the field**

Open `src/lib/query-keys.ts`. The file currently reads:

```ts
export const ACCOUNT_QUERY_KEY = ['account'] as const;

export type AccountDto = {
  id: string;
  email: string;
  displayName: string;
  notification?: boolean;
  provider: string;
};
```

Change it to:

```ts
export const ACCOUNT_QUERY_KEY = ['account'] as const;

export type AccountDto = {
  id: string;
  email: string;
  displayName: string;
  notification?: boolean;
  sound?: boolean;
  provider: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/query-keys.ts
git commit -m "feat: add sound field to AccountDto"
```

---

### Task 2: Expose `setMuted` on `AudioContext`

**Files:**
- Modify: `src/context/audio-context.tsx`

- [ ] **Step 1: Update the context type and value**

Open `src/context/audio-context.tsx`. Make the following changes:

1. Add `setMuted` to `AudioContextValue`:

```ts
type AudioContextValue = {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (val: boolean) => void;
};
```

2. Update the default context value:

```ts
const AudioContext = createContext<AudioContextValue>({
  isMuted: false,
  toggleMute: () => {},
  setMuted: () => {},
});
```

3. Add the `setMuted` implementation inside `AudioProvider`, right after `toggleMute`:

```ts
const setMuted = (val: boolean) => {
  setIsMuted(val);
  if (playerRef.current) {
    playerRef.current.volume = val ? 0 : 1;
  }
};
```

4. Add `setMuted` to the Provider value:

```ts
return (
  <AudioContext.Provider value={{ isMuted, toggleMute, setMuted }}>
    {children}
  </AudioContext.Provider>
);
```

The full file after changes:

```ts
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type AudioContextValue = {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (val: boolean) => void;
};

const AudioContext = createContext<AudioContextValue>({
  isMuted: false,
  toggleMute: () => {},
  setMuted: () => {},
});

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let player: AudioPlayer | null = null;
    let cancelled = false;
    let idleHandle: ReturnType<typeof requestIdleCallback> | null = null;

    idleHandle = requestIdleCallback(async () => {
      if (cancelled) return;
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        if (cancelled) return;
        player = createAudioPlayer(require('../../assets/audio/meditation.mp3'));
        player.loop = true;
        player.volume = 1;
        player.play();
        playerRef.current = player;
      } catch {}
    });

    return () => {
      cancelled = true;
      if (idleHandle !== null) cancelIdleCallback(idleHandle);
      player?.remove();
    };
  }, []);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (playerRef.current) {
        playerRef.current.volume = next ? 0 : 1;
      }
      return next;
    });
  };

  const setMuted = (val: boolean) => {
    setIsMuted(val);
    if (playerRef.current) {
      playerRef.current.volume = val ? 0 : 1;
    }
  };

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, setMuted }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
```

- [ ] **Step 2: Commit**

```bash
git add src/context/audio-context.tsx
git commit -m "feat: expose setMuted on AudioContext"
```

---

### Task 3: Wire sound toggle in You screen

**Files:**
- Modify: `src/app/(tabs)/you.tsx`

- [ ] **Step 1: Import `useAudio` and add `soundEnabled` state + `updateSound` mutation**

At the top of `YouScreen`, add the `useAudio` import and destructure `setMuted`:

```ts
import { useAudio } from '@/context/audio-context';
```

Inside `YouScreen`, after the existing `const { data: account }` query, add:

```ts
const { setMuted } = useAudio();
const [soundEnabled, setSoundEnabled] = useState<boolean | undefined>(undefined);
```

After the existing `useEffect` that syncs `notifEnabled` from `account?.notification`, add:

```ts
useEffect(() => {
  if (account?.sound !== undefined) {
    setSoundEnabled(account.sound);
    setMuted(!account.sound);
  }
}, [account?.sound]);
```

After the existing `updateNotification` mutation, add:

```ts
const { mutate: updateSound, isPending: savingSound } = useMutation({
  mutationFn: (sound: boolean) => api.patch('/accounts', { sound }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY }),
});
```

- [ ] **Step 2: Add `handleSoundToggle`**

After `handleNotifToggle`, add:

```ts
const handleSoundToggle = (val: boolean) => {
  setSoundEnabled(val);
  setMuted(!val);
  updateSound(val);
};
```

- [ ] **Step 3: Add the Appearance card in JSX**

In the JSX, find the `{/* Others */}` card block (around line 292). Insert the new card **before** it:

```tsx
{/* Appearance */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>Appearance</Text>
  <View style={styles.divider} />

  <View style={styles.row}>
    <Ionicons name="volume-medium-outline" size={20} color={Palette.majorelleBlue} />
    <View style={styles.notifLabelGroup}>
      <Text style={styles.rowLabel}>Sound</Text>
      <Text style={styles.notifSubtext}>Background music</Text>
    </View>
    <Switch
      value={soundEnabled ?? false}
      onValueChange={handleSoundToggle}
      disabled={savingSound}
      trackColor={{ false: 'rgba(171,129,205,0.2)', true: 'rgba(87,74,226,0.6)' }}
      thumbColor={Palette.majorelleBlue}
    />
  </View>
</View>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(tabs)/you.tsx
git commit -m "feat: add sound toggle in Appearance section on You screen"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start the app**

```bash
npx expo start
```

- [ ] **Step 2: Verify toggle behavior**

1. Open the You screen — confirm the "Appearance" card appears between "Notification" and "Others"
2. Toggle Sound ON → background music should play (if on native) / `isMuted` should be `false`
3. Toggle Sound OFF → music should mute / `isMuted` should be `true`
4. Reload the app — the toggle should restore to the last saved state (from `account?.sound`)

- [ ] **Step 3: Verify API call**

In dev tools / backend logs, confirm `PATCH /accounts` is called with `{ "sound": true }` or `{ "sound": false }` when toggling.
