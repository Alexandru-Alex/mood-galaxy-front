import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { api, logout } from '@/lib/api';
import { BottomTabInset, Palette, Spacing } from '@/constants/theme';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';

type AccountDto = {
  id: string;
  email: string;
  displayName: string;
  isNotification: boolean;
};

export default function YouScreen() {
  const [account, setAccount] = useState<AccountDto | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    api.get<AccountDto>('/accounts').then(setAccount).catch(console.error);
  }, []);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/landing');
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete('/accounts');
    } catch {}
    await logout();
    router.replace('/landing');
  };

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
        <View style={styles.profileCard}>
          <View style={styles.profileNebula} pointerEvents="none" />
          <View style={styles.avatarRing}>
<Image
              source={require('@/assets/images/astronaut-avatar.png')}
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.displayName} numberOfLines={1}>
            {account?.displayName ?? '—'}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {account?.email ?? '—'}
          </Text>
        </View>

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

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowLogoutModal(false)}>
          <Pressable style={styles.modal} {...stopPropWeb}>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out?
            </Text>
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

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
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
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
              >
                <Text style={styles.btnDangerLabel}>{deletingAccount ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050410',
  },
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
    paddingBottom: Spacing.four,
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
  avatarImage: {
    width: 60,
    height: 60,
    marginTop: 16,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    fontWeight: '500',
    color: Palette.brightLavender,
  },

  // Card
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(171,129,205,0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: { opacity: 0.6 },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    flex: 1,
  },
  rowChevron: {
    fontSize: 18,
    color: 'rgba(171,129,205,0.35)',
  },
  dangerLabel: { color: '#e74c3c' },

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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: Spacing.two,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.brightLavender,
    marginBottom: Spacing.four,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(171,129,205,0.4)',
    alignItems: 'center',
  },
  btnCancelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.mauve,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Palette.majorelleBlue,
    alignItems: 'center',
  },
  btnPrimaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  btnDanger: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#c0392b',
    alignItems: 'center',
  },
  btnDangerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
