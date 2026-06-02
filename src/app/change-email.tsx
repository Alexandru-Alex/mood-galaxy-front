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
