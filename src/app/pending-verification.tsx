import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Float } from '@/components/float';
import { AstronautLanding } from '@/components/astronaut-landing';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { Palette } from '@/constants/theme';
import { logout, api } from '@/lib/api';

export default function PendingVerificationScreen() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleBackToLogin = async () => {
    try {
      await logout();
    } finally {
      router.replace('/landing');
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendStatus('idle');
    try {
      await api.post('/resend-verification', {});
      setResendStatus('success');
    } catch {
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      <SafeAreaView style={styles.safe}>
        <Float amplitude={10} duration={2400}>
          <AstronautLanding width={130} height={114} />
        </Float>

        <Text style={styles.title}>Check your email ✦</Text>
        <Text style={styles.body}>
          We sent a verification link to your email address.{'\n'}
          Open it to activate your account.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.resendBtn, pressed && styles.btnPressed, resending && styles.btnDisabled]}
          onPress={handleResend}
          disabled={resending}>
          {resending ? (
            <ActivityIndicator color={Palette.majorelleBlue} size="small" />
          ) : (
            <Text style={styles.resendBtnText}>Resend Email</Text>
          )}
        </Pressable>

        {resendStatus === 'success' && (
          <Text style={styles.statusSuccess}>Email sent! Check your inbox.</Text>
        )}
        {resendStatus === 'error' && (
          <Text style={styles.statusError}>Failed to resend. Please try again.</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={handleBackToLogin}>
          <Text style={styles.btnText}>Back to Sign In</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f3eefb',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: Palette.brightLavender,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: 8,
    backgroundColor: Palette.majorelleBlue,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  btnPressed: { opacity: 0.8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  resendBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Palette.majorelleBlue,
    paddingVertical: 13,
    paddingHorizontal: 32,
    minWidth: 160,
    alignItems: 'center',
  },
  resendBtnText: { color: Palette.majorelleBlue, fontSize: 15, fontWeight: '600' },
  statusSuccess: { fontSize: 13, color: '#7ee8a2', textAlign: 'center' },
  statusError: { fontSize: 13, color: '#ff7b7b', textAlign: 'center' },
});
