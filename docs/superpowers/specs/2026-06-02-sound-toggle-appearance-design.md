# Sound Toggle — Appearance Section

**Date:** 2026-06-02
**Status:** Approved

## Summary

Add a sound toggle to the You screen under a new "Appearance" card section. The toggle controls background music playback and persists the preference to the backend via `PATCH /accounts`, mirroring the existing notification toggle pattern.

## Changes

### `src/lib/query-keys.ts`
Add `sound?: boolean` to `AccountDto`.

### `src/context/audio-context.tsx`
Expose `setMuted(val: boolean)` alongside the existing `toggleMute`, so consumers can set an exact muted state (not just flip) when syncing from account data on mount.

### `src/app/(tabs)/you.tsx`

**New state:**
- `soundEnabled: boolean | undefined` — mirrors `notifEnabled` pattern; initialized from `account?.sound`

**New mutation:**
- `updateSound` — `api.patch('/accounts', { sound: boolean })`, invalidates `ACCOUNT_QUERY_KEY` on success

**New `useEffect`:**
- When `account?.sound` loads, call `setMuted(!account.sound)` to sync the audio context

**New `handleSoundToggle`:**
- Sets `soundEnabled` state
- Calls `setMuted(!val)` on the audio context
- Calls `updateSound(val)`

**New card — "Appearance"** (inserted between Notification and Others):
```
APPEARANCE
─────────────────────────────────────────
🔊  Sound               [Switch]
    Background music
```
- Icon: `volume-medium-outline` (Ionicons)
- Switch props identical to notification toggle (trackColor, thumbColor)
- `disabled` when `savingSound` is true

## Toggle semantics
- Switch ON → sound enabled → `isMuted = false`
- Switch OFF → sound disabled → `isMuted = true`
- Default (no account value): treats `undefined` as `false` (Switch off, sound off) — consistent with how notification default works

## Out of scope
- No toast/permission flow needed (sound needs no OS permission)
- No sub-controls (no time picker like notifications)
