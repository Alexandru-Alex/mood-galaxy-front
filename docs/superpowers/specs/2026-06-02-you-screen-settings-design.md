# You Screen — Settings Parity Design

**Date:** 2026-06-02  
**Scope:** Port `/settings` from `bugetGarden-front` into `src/app/(tabs)/you.tsx` of `mood-galaxy`, excluding the Appearance section (Currency, Decimal places). Galaxy visual theme throughout.

---

## Goal

The You tab becomes a full settings screen matching bugetGarden's feature set:
- Editable display name
- Manage Account (change email / change password, disabled for OAuth users)
- Notifications (daily reminder toggle + hour picker on native)
- Log Out / Delete Account (already exists, preserved)

No avatar picker — single static astronaut avatar remains.

---

## Sections (top to bottom)

### 1. Profile Card
- Static astronaut avatar (no picker)
- Tappable display name → opens Change Name modal (`PATCH /accounts` with `{ name, currency: null }`)
- Read-only email
- Sync row with animated rotate icon — invalidates all queries, records last-sync timestamp

### 2. Manage Account Card
- **Change Email** row → navigates to `src/app/change-email.tsx`  
  Endpoint: `PATCH /accounts/email` with `{ currentPassword: SHA256(pwd), newEmail }` → redirects to pending-verification
- **Change Password** row → navigates to `src/app/change-password.tsx`  
  Endpoint: `PATCH /accounts/password` with `{ currentPassword: SHA256(cur), newPassword: SHA256(new) }` → success toast then back
- Both rows are **disabled** (muted icon + label) when `account.provider !== "local"` (Google/OAuth accounts)

### 3. Notification Card
- Toggle "Remind everyday" → `PATCH /accounts` with `{ name: null, currency: null, numberOfDecimals: null, notification: bool }`
- On enable: request OS permission first; if denied, show toast "Enable notifications in your device settings" and revert toggle
- Hour picker (native only, hidden on web): chevron-back/forward buttons, format `HH:00`; debounced `scheduleDaily(hour)` on change
- "Notification settings" link row (native only) → `Linking.openSettings()`
- Toast for permission-denied message (auto-dismiss 3s)

### 4. Others Card (unchanged functionality)
- Log Out → confirm modal → `logout()` → `/landing`
- Delete Account → confirm modal → `DELETE /accounts` + `logout()` → `/landing`

---

## AccountDto Extension

```ts
type AccountDto = {
  id: string;
  email: string;
  displayName: string;
  isNotification: boolean;
  provider: string;          // add: "local" | "google" | ...
  notification?: boolean;    // align with bugetGarden patch field name
};
```

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/notifications.ts` | Permission request, scheduleDaily, saveHour, getSavedHour, cancelAll, setEnabledFlag — ported from bugetGarden; notification content updated to mood-galaxy theme |
| `src/lib/sync.ts` | In-memory last-sync date + relativeTime formatter — exact port |
| `src/lib/query-keys.ts` | `ACCOUNT_QUERY_KEY = ["account"]` + `AccountDto` interface |
| `src/app/change-email.tsx` | Galaxy-themed screen: SpaceBackground + Starfield + back chevron header, same logic as bugetGarden |
| `src/app/change-password.tsx` | Galaxy-themed screen: same structure, success toast then back |

---

## Modified Files

| File | Change |
|------|--------|
| `src/app/(tabs)/you.tsx` | Full rewrite — add profile card with name edit, sync, manage account, notifications, keep Others |
| `src/app/_layout.tsx` | Register `change-email` and `change-password` in the Stack |

---

## Dependencies

- Install `expo-notifications` (not currently in package.json)
- `expo-crypto` already present (used for SHA256 in change-email/change-password)
- `@tanstack/react-query` already present
- `react-native-reanimated` already present (sync icon spin)

---

## Styling

All new UI uses the existing galaxy palette (`Palette`, `Spacing`, `BottomTabInset` from `src/constants/theme.ts`):
- Cards: `#08061c` background, `rgba(171,129,205,0.15)` border, 16px radius
- Accent color for icons and interactive elements: `Palette.majorelleBlue` (`#574ae2`)
- Muted/disabled: `rgba(171,129,205,0.35)`
- Danger: `#e74c3c` / `#c0392b`
- Change-email/password screens: `SpaceBackground` + `Starfield` + dark card form, matching existing auth screen style
