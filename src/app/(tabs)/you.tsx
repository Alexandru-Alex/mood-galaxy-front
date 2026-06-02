import { useEffect, useRef, useState } from 'react';
import {
  Image, Linking, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
import { useAudio, persistSoundEnabled } from '@/context/audio-context';

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

  const { setMuted } = useAudio();
  const [soundEnabled, setSoundEnabled] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (account?.notification !== undefined) setNotifEnabled(account.notification);
  }, [account?.notification]);

  useEffect(() => {
    if (account?.sound !== undefined) {
      setSoundEnabled(account.sound);
      setMuted(!account.sound);
      void persistSoundEnabled(account.sound);
    }
  }, [account?.sound, setMuted]);

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

  const { mutate: updateSound, isPending: savingSound } = useMutation({
    mutationFn: (sound: boolean) => api.patch('/accounts', { sound }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY }),
    onError: (_err, sound) => {
      setSoundEnabled(!sound);
      setMuted(sound);
    },
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

  const handleSoundToggle = (val: boolean) => {
    setSoundEnabled(val);
    setMuted(!val);
    updateSound(val);
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
            onPress={() => router.push('/change-email' as any)}
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
            onPress={() => router.push('/change-password' as any)}
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
