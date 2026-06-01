import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api, logout } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Palette, Spacing } from '@/constants/theme';

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
  const theme = useTheme();

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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.displayName, { color: theme.text }]} numberOfLines={1}>
            {account?.displayName ?? '—'}
          </Text>
          <Text style={[styles.email, { color: theme.textSecondary }]} numberOfLines={1}>
            {account?.email ?? '—'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Others</Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons name="log-out-outline" size={20} color={Palette.majorelleBlue} />
            <Text style={[styles.rowLabel, { color: theme.text }]}>Log Out</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setShowDeleteModal(true)}
          >
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
            <Text style={[styles.rowLabel, styles.dangerLabel]}>Delete Account</Text>
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
          <Pressable style={[styles.modal, { backgroundColor: theme.backgroundElement }]} {...stopPropWeb}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Log Out</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Are you sure you want to log out?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.btnCancel, { opacity: pressed ? 0.7 : 1, borderColor: theme.border }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.btnCancelLabel, { color: theme.text }]}>Cancel</Text>
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
          <Pressable style={[styles.modal, { backgroundColor: theme.backgroundElement }]} {...stopPropWeb}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Delete Account</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              This will permanently delete your account and all data. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.btnCancel, { opacity: pressed ? 0.7 : 1, borderColor: theme.border }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.btnCancelLabel, { color: theme.text }]}>Cancel</Text>
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
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.two,
  },
  profileCard: {
    borderRadius: 16,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 4,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.two,
  },
  divider: { height: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: { opacity: 0.65 },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dangerLabel: { color: '#e74c3c' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  modal: {
    borderRadius: 16,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
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
    borderWidth: 1,
    alignItems: 'center',
  },
  btnCancelLabel: {
    fontSize: 15,
    fontWeight: '600',
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
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  btnDangerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
