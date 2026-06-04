# You Screen — Settings Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port bugetGarden-front's `/settings` screen into mood-galaxy's You tab, with galaxy styling, excluding the Appearance section.

**Architecture:** Add three utility libs (query-keys, sync, notifications), two new stack screens (change-email, change-password), then fully rewrite `you.tsx` to mirror the bugetGarden settings layout using the existing galaxy palette. All data fetching migrates from raw `useEffect` to `useQuery`/`useMutation`.

**Tech Stack:** Expo Router, `@tanstack/react-query`, `expo-notifications`, `expo-crypto`, `react-native-reanimated`, `expo-secure-store`

---

## Task 1: Install expo-notifications

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npx expo install expo-notifications
```

Expected output: package added to `node_modules`, `package.json` updated with `"expo-notifications": "~0.x.x"`.

- [ ] **Step 2: Verify install**

```bash
node -e "require('./node_modules/expo-notifications/build/index')"
```

Expected: no error output.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-notifications"
```

---

## Task 2: Create src/lib/query-keys.ts

**Files:**
- Create: `src/lib/query-keys.ts`

- [ ] **Step 1: Create the file**

`src/lib/query-keys.ts`:
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

- [ ] **Step 2: Commit**

```bash
git add src/lib/query-keys.ts
git commit -m "feat: add account query key and DTO"
```

---

## Task 3: Create src/lib/sync.ts

**Files:**
- Create: `src/lib/sync.ts`

- [ ] **Step 1: Create the file**

`src/lib/sync.ts`:
```ts
let _lastSync: Date | null = null;

export function getLastSync(): Date | null { return _lastSync; }

export function setLastSync(date: Date): void { _lastSync = date; }

export function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sync.ts
git commit -m "feat: add sync timestamp utility"
```

---

## Task 4: Create src/lib/notifications.ts

**Files:**
- Create: `src/lib/notifications.ts`

- [ ] **Step 1: Create the file**

`src/lib/notifications.ts`:
```ts
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const HOUR_KEY = 'notif_hour';
const ENABLED_KEY = 'notif_enabled';
const DEFAULT_HOUR = 20;
const CHANNEL_ID = 'daily-reminder';

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily Reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function getSavedHour(): Promise<number> {
  if (Platform.OS === 'web') return DEFAULT_HOUR;
  const stored = await SecureStore.getItemAsync(HOUR_KEY);
  if (stored === null) return DEFAULT_HOUR;
  const parsed = parseInt(stored, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_HOUR;
}

export async function saveHour(hour: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(HOUR_KEY, String(hour));
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDaily(hour: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Mood Galaxy 🌌',
      body: "Don't forget to log your mood today!",
      ...(Platform.OS === 'android' ? { android: { channelId: CHANNEL_ID } } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: 0,
    },
  });
}

export async function cancelAll(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function setEnabledFlag(value: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(ENABLED_KEY, value ? '1' : '0');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat: add notifications utility"
```

---

## Task 5: Register new screens in _layout.tsx

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Add the two new Stack.Screen entries**

In `src/app/_layout.tsx`, find the `<Stack>` block and add after the existing screens:

```tsx
<Stack.Screen name="change-email" />
<Stack.Screen name="change-password" />
```

The full Stack block should look like:
```tsx
<Stack initialRouteName="landing" screenOptions={{ headerShown: false }}>
  <Stack.Screen name="landing" />
  <Stack.Screen name="welcome" />
  <Stack.Screen name="dashboard" />
  <Stack.Screen name="pending-verification" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="galaxy" />
  <Stack.Screen name="auth" />
  <Stack.Screen name="change-email" />
  <Stack.Screen name="change-password" />
</Stack>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: register change-email and change-password routes"
```

---

## Task 6: Rewrite src/app/(tabs)/you.tsx

**Files:**
- Modify: `src/app/(tabs)/you.tsx`

- [ ] **Step 1: Replace the entire file**

`src/app/(tabs)/you.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import {
  Image, Linking, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Switch, Text, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TextInput } from 'react-native';

import { api, logout } from '@/lib/api';
import { ACCOUNT_QUERY_KEY, type AccountDto } from '@/lib/query-keys';
import { getLastSync, relativeTime, setLastSync } from '@/lib/sync';
import {
  cancelAll, getSavedHour, requestPermission,
  saveHour, scheduleDaily, setEnabledFlag,
} from '@/lib/notifications';
import { BottomTabInset, Palette, Spacing } from '@/constants/theme';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';

export default function YouScreen() {
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState<boolean | undefined>(undefined);
  const [notifHour, setNotifHour] = useState(20);
  const [notifToast, setNotifToast] = useState<string | null>(null);
  const notifToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hourChangeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncLabel, setSyncLabel] = useState(() => {
    const last = getLastSync();
    return last ? relativeTime(last) : 'Never synced';
  });

  const rotation = useSharedValue(0);
  const syncIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: account } = useQuery<AccountDto>({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: () => api.get('/accounts'),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (account?.notification !== undefined) setNotifEnabled(account.notification);
  }, [account?.notification]);

  useEffect(() => {
    if (Platform.OS !== 'web') getSavedHour().then(setNotifHour);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const last = getLastSync();
      if (last) setSyncLabel(relativeTime(last));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (notifToastTimer.current) clearTimeout(notifToastTimer.current);
      if (hourChangeDebounce.current) clearTimeout(hourChangeDebounce.current);
    };
  }, []);

  const { mutate: updateName, isPending: savingName } = useMutation({
    mutationFn: (name: string) => api.patch('/accounts', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
      setShowNameModal(false);
    },
  });

  const { mutate: updateNotification, isPending: savingNotification } = useMutation({
    mutationFn: (notification: boolean) => api.patch('/accounts', { notification }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY }),
  });

  const { mutate: deleteAccount, isPending: deletingAccount } = useMutation({
    mutationFn: () => api.delete('/accounts'),
    onSuccess: async () => {
      setShowDeleteModal(false);
      await logout();
      queryClient.clear();
      router.replace('/landing');
    },
  });

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    queryClient.clear();
    router.replace('/landing');
  };

  const handleSync = () => {
    rotation.value = withTiming(rotation.value + 360, { duration: 600 });
    queryClient.invalidateQueries();
    setLastSync(new Date());
    setSyncLabel('Just now');
  };

  const handleNotifToggle = async (val: boolean) => {
    if (val) {
      const granted = await requestPermission();
      if (!granted) {
        setNotifEnabled(false);
        if (notifToastTimer.current) clearTimeout(notifToastTimer.current);
        setNotifToast('Enable notifications in your device settings');
        notifToastTimer.current = setTimeout(() => setNotifToast(null), 3000);
        return;
      }
      setNotifEnabled(true);
      await setEnabledFlag(true);
      await saveHour(notifHour);
      await scheduleDaily(notifHour);
    } else {
      setNotifEnabled(false);
      await setEnabledFlag(false);
      await cancelAll();
    }
    updateNotification(val);
  };

  const handleHourChange = (h: number) => {
    setNotifHour(h);
    if (hourChangeDebounce.current) clearTimeout(hourChangeDebounce.current);
    hourChangeDebounce.current = setTimeout(async () => {
      await saveHour(h);
      await scheduleDaily(h);
    }, 400);
  };

  const isLocalAccount = account?.provider === 'local';
  const stopPropWeb = Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation() } : undefined;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileNebula} pointerEvents="none" />
          <View style={styles.avatarRing}>
            <Image
              source={require('@/assets/images/astronaut-avatar.png')}
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>
          <Pressable
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            onPress={() => {
              setNameInput(account?.displayName ?? '');
              setShowNameModal(true);
            }}
          >
            <Text style={styles.displayName} numberOfLines={1}>
              {account?.displayName ?? '—'}
            </Text>
          </Pressable>
          <Text style={styles.email} numberOfLines={1}>
            {account?.email ?? '—'}
          </Text>

          <View style={styles.cardDivider} />

          <Pressable
            style={({ pressed }) => [styles.syncRow, pressed && styles.syncRowPressed]}
            onPress={handleSync}
          >
            <Animated.View style={syncIconStyle}>
              <Ionicons name="sync-outline" size={20} color={Palette.majorelleBlue} />
            </Animated.View>
            <Text style={styles.syncLabel}>Sync</Text>
            <Text style={styles.syncSubLabel}>{syncLabel}</Text>
          </Pressable>
        </View>

        {/* Manage Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manage Account</Text>
          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [
              styles.row,
              pressed && isLocalAccount && styles.rowPressed,
              !isLocalAccount && styles.rowDisabled,
            ]}
            onPress={() => router.push('/change-email')}
            disabled={!isLocalAccount}
          >
            <Ionicons name="mail-outline" size={20} color={isLocalAccount ? Palette.majorelleBlue : 'rgba(171,129,205,0.3)'} />
            <Text style={[styles.rowLabel, !isLocalAccount && styles.rowLabelDisabled]}>Change Email</Text>
            <Ionicons name="chevron-forward" size={16} color={isLocalAccount ? 'rgba(171,129,205,0.5)' : 'rgba(171,129,205,0.2)'} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [
              styles.row,
              pressed && isLocalAccount && styles.rowPressed,
              !isLocalAccount && styles.rowDisabled,
            ]}
            onPress={() => router.push('/change-password')}
            disabled={!isLocalAccount}
          >
            <Ionicons name="lock-closed-outline" size={20} color={isLocalAccount ? Palette.majorelleBlue : 'rgba(171,129,205,0.3)'} />
            <Text style={[styles.rowLabel, !isLocalAccount && styles.rowLabelDisabled]}>Change Password</Text>
            <Ionicons name="chevron-forward" size={16} color={isLocalAccount ? 'rgba(171,129,205,0.5)' : 'rgba(171,129,205,0.2)'} />
          </Pressable>
        </View>

        {/* Notification */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notification</Text>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color={Palette.majorelleBlue} />
            <View style={styles.notifLabelGroup}>
              <Text style={styles.rowLabel}>Remind everyday</Text>
              <Text style={styles.notifSubtext}>Remind to log your mood</Text>
            </View>
            <Switch
              value={notifEnabled ?? false}
              onValueChange={handleNotifToggle}
              disabled={savingNotification}
              trackColor={{ false: 'rgba(171,129,205,0.2)', true: 'rgba(87,74,226,0.6)' }}
              thumbColor={Palette.majorelleBlue}
            />
          </View>

          {notifEnabled && Platform.OS !== 'web' && (
            <>
              <View style={styles.divider} />
              <View style={styles.notifTimeRow}>
                <Text style={styles.notifTimeLabel}>Remind at:</Text>
                <View style={styles.notifTimeControls}>
                  <Pressable onPress={() => handleHourChange((notifHour - 1 + 24) % 24)}>
                    <Ionicons name="chevron-back" size={20} color={Palette.majorelleBlue} />
                  </Pressable>
                  <Text style={styles.notifTimeValue}>
                    {String(notifHour).padStart(2, '0')}:00
                  </Text>
                  <Pressable onPress={() => handleHourChange((notifHour + 1) % 24)}>
                    <Ionicons name="chevron-forward" size={20} color={Palette.majorelleBlue} />
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {Platform.OS !== 'web' && <View style={styles.divider} />}

          {Platform.OS !== 'web' && (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => Linking.openSettings()}
            >
              <Ionicons name="settings-outline" size={20} color={Palette.majorelleBlue} />
              <Text style={styles.rowLabel}>Notification settings</Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(171,129,205,0.5)" />
            </Pressable>
          )}
        </View>

        {/* Others */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Others</Text>
          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons name="log-out-outline" size={20} color={Palette.brightLavender} />
            <Text style={styles.rowLabel}>Log Out</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setShowDeleteModal(true)}
          >
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
            <Text style={[styles.rowLabel, styles.dangerLabel]}>Delete Account</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Change Name Modal */}
      <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => setShowNameModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowNameModal(false)}>
          <Pressable style={styles.modal} {...stopPropWeb}>
            <Text style={styles.modalTitle}>Change Name</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor="rgba(171,129,205,0.5)"
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.btnCancel, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.btnCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, { opacity: pressed || savingName ? 0.7 : 1 }]}
                onPress={() => { const t = nameInput.trim(); if (t) updateName(t); }}
                disabled={savingName}
              >
                <Text style={styles.btnPrimaryLabel}>{savingName ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowLogoutModal(false)}>
          <Pressable style={styles.modal} {...stopPropWeb}>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.btnCancel, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.btnCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, { opacity: pressed ? 0.7 : 1 }]}
                onPress={handleLogout}
              >
                <Text style={styles.btnPrimaryLabel}>Log Out</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={styles.modal} {...stopPropWeb}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This will permanently delete your account and all data. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.btnCancel, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.btnCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnDanger, { opacity: pressed || deletingAccount ? 0.7 : 1 }]}
                onPress={() => deleteAccount()}
                disabled={deletingAccount}
              >
                <Text style={styles.btnDangerLabel}>{deletingAccount ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {notifToast !== null && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{notifToast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050410' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.two,
  },

  // Profile card
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
    backgroundColor: '#08061c',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: 4,
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileNebula: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(87,74,226,0.12)',
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(87,74,226,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(171,129,205,0.45)',
    marginBottom: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 60, height: 60, marginTop: 16 },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  email: { fontSize: 13, fontWeight: '500', color: Palette.brightLavender, marginBottom: Spacing.three },
  cardDivider: { height: 1, backgroundColor: 'rgba(171,129,205,0.1)', width: '100%' },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
    width: '100%',
  },
  syncRowPressed: { opacity: 0.6 },
  syncLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#ffffff' },
  syncSubLabel: { fontSize: 12, color: 'rgba(171,129,205,0.6)' },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.15)',
    backgroundColor: '#08061c',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 4,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Palette.brightLavender,
    marginBottom: Spacing.two,
  },
  divider: { height: 1, backgroundColor: 'rgba(171,129,205,0.1)' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowPressed: { opacity: 0.6 },
  rowDisabled: { opacity: 0.4 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: '#ffffff', flex: 1 },
  rowLabelDisabled: { color: 'rgba(171,129,205,0.4)' },
  rowChevron: { fontSize: 18, color: 'rgba(171,129,205,0.35)' },
  dangerLabel: { color: '#e74c3c' },

  // Notification extras
  notifLabelGroup: { flex: 1 },
  notifSubtext: { fontSize: 12, color: 'rgba(171,129,205,0.6)', marginTop: 2 },
  notifTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  notifTimeLabel: { fontSize: 14, color: Palette.brightLavender },
  notifTimeControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  notifTimeValue: { fontSize: 16, fontWeight: '700', color: '#ffffff', minWidth: 48, textAlign: 'center' },

  // Modals
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,4,16,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  modal: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.2)',
    backgroundColor: '#08061c',
    padding: Spacing.four,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: Spacing.two },
  modalMessage: { fontSize: 14, lineHeight: 20, color: Palette.brightLavender, marginBottom: Spacing.four },
  modalButtons: { flexDirection: 'row', gap: Spacing.two },
  nameInput: {
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.3)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#ffffff',
    marginBottom: Spacing.three,
    backgroundColor: 'rgba(87,74,226,0.08)',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(171,129,205,0.4)',
    alignItems: 'center',
  },
  btnCancelLabel: { fontSize: 15, fontWeight: '600', color: Palette.mauve },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Palette.majorelleBlue,
    alignItems: 'center',
  },
  btnPrimaryLabel: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  btnDanger: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#c0392b',
    alignItems: 'center',
  },
  btnDangerLabel: { fontSize: 15, fontWeight: '600', color: '#ffffff' },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,20,60,0.92)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.3)',
  },
  toastText: { fontSize: 13, color: Palette.brightLavender },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(tabs\)/you.tsx
git commit -m "feat: rewrite you screen with profile edit, manage account, notifications"
```

---

## Task 7: Create src/app/change-email.tsx

**Files:**
- Create: `src/app/change-email.tsx`

- [ ] **Step 1: Create the file**

`src/app/change-email.tsx`:
```tsx
import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { api } from '@/lib/api';
import { ACCOUNT_QUERY_KEY } from '@/lib/query-keys';
import { Palette, Spacing } from '@/constants/theme';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';

export default function ChangeEmailScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: async () => {
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        currentPassword,
      );
      return api.patch('/accounts/email', { currentPassword: hashedPassword, newEmail });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
      if (Platform.OS === 'web') {
        localStorage.setItem('pending_email', newEmail);
      } else {
        await SecureStore.setItemAsync('pending_email', newEmail);
      }
      router.replace('/pending-verification');
    },
  });

  const canSubmit = currentPassword.length > 0 && newEmail.includes('@') && !isPending;
  const errorMsg = (error as Error | null)?.message ?? null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />

      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 56 : insets.top + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/you')}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Change Email</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>New Email</Text>
          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={18} color={Palette.brightLavender} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={newEmail}
              onChangeText={(t) => { reset(); setNewEmail(t); }}
              placeholder="Enter new email"
              placeholderTextColor="rgba(171,129,205,0.4)"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.sectionLabel}>Current Password</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={18} color={Palette.brightLavender} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={currentPassword}
              onChangeText={(t) => { reset(); setCurrentPassword(t); }}
              placeholder="Enter current password"
              placeholderTextColor="rgba(171,129,205,0.4)"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              !canSubmit && styles.saveBtnDisabled,
              { opacity: pressed && canSubmit ? 0.8 : 1 },
            ]}
            onPress={() => mutate()}
            disabled={!canSubmit}
          >
            <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050410' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#ffffff' },
  headerSpacer: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.brightLavender,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: Spacing.three,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.25)',
    borderRadius: 12,
    backgroundColor: '#08061c',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: {},
  textInput: { flex: 1, fontSize: 15, color: '#ffffff' },
  errorText: { fontSize: 13, color: '#e74c3c', marginTop: Spacing.two },
  saveBtn: {
    marginTop: Spacing.four,
    backgroundColor: Palette.majorelleBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(87,74,226,0.35)' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/change-email.tsx
git commit -m "feat: add change email screen"
```

---

## Task 8: Create src/app/change-password.tsx

**Files:**
- Create: `src/app/change-password.tsx`

- [ ] **Step 1: Create the file**

`src/app/change-password.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMutation } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

import { api } from '@/lib/api';
import { Palette, Spacing } from '@/constants/theme';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: async () => {
      const [hashedCurrent, hashedNew] = await Promise.all([
        Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, currentPassword),
        Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPassword),
      ]);
      return api.patch('/accounts/password', { currentPassword: hashedCurrent, newPassword: hashedNew });
    },
    onSuccess: () => {
      setToastVisible(true);
      toastTimer.current = setTimeout(() => {
        setToastVisible(false);
        router.canGoBack() ? router.back() : router.replace('/(tabs)/you');
      }, 2000);
    },
  });

  const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && !isPending;
  const errorMsg = (error as Error | null)?.message ?? null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />

      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 56 : insets.top + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/you')}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Current Password</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={18} color={Palette.brightLavender} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={currentPassword}
              onChangeText={(t) => { reset(); setCurrentPassword(t); }}
              placeholder="Enter current password"
              placeholderTextColor="rgba(171,129,205,0.4)"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.sectionLabel}>New Password</Text>
          <View style={styles.inputBox}>
            <Ionicons name="key-outline" size={18} color={Palette.brightLavender} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={newPassword}
              onChangeText={(t) => { reset(); setNewPassword(t); }}
              placeholder="Enter new password"
              placeholderTextColor="rgba(171,129,205,0.4)"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              !canSubmit && styles.saveBtnDisabled,
              { opacity: pressed && canSubmit ? 0.8 : 1 },
            ]}
            onPress={() => mutate()}
            disabled={!canSubmit}
          >
            <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {toastVisible && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>Password updated successfully</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050410' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#ffffff' },
  headerSpacer: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.brightLavender,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: Spacing.three,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.25)',
    borderRadius: 12,
    backgroundColor: '#08061c',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: {},
  textInput: { flex: 1, fontSize: 15, color: '#ffffff' },
  errorText: { fontSize: 13, color: '#e74c3c', marginTop: Spacing.two },
  saveBtn: {
    marginTop: Spacing.four,
    backgroundColor: Palette.majorelleBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(87,74,226,0.35)' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,20,60,0.92)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.3)',
  },
  toastText: { fontSize: 13, color: Palette.brightLavender },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/change-password.tsx
git commit -m "feat: add change password screen"
```
