import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AstronautLanding } from '@/components/astronaut-landing';
import { Float } from '@/components/float';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { Palette } from '@/constants/theme';
import { clearPendingEmail, getStoredToken, setIsNewUserCache } from '@/lib/api';

export default function EmailVerifiedScreen() {
  const router = useRouter();
  const { success } = useLocalSearchParams<{ success?: string }>();

  const isSuccess = success === 'true';

  const handleContinue = async () => {
    await clearPendingEmail();
    const token = await getStoredToken();
    if (!token) { router.replace('/landing'); return; }
    const isNew = Platform.OS === 'web'
      ? localStorage.getItem('is_new_user')
      : await SecureStore.getItemAsync('is_new_user');
    if (isNew === 'true') {
      setIsNewUserCache(true);
      router.replace('/welcome');
    } else {
      router.replace('/');
    }
  };

  const handleTryAgain = async () => {
    const token = await getStoredToken();
    router.replace(token ? '/pending-verification' : '/landing');
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

        <View style={[styles.iconCircle, isSuccess ? styles.iconCircleSuccess : styles.iconCircleError]}>
          <Text style={styles.iconText}>{isSuccess ? '✓' : '✕'}</Text>
        </View>

        <Text style={styles.title}>
          {isSuccess ? 'Email verified ✦' : 'Link expired or invalid'}
        </Text>
        <Text style={styles.body}>
          {isSuccess
            ? 'Your account is ready.\nYou can now explore your galaxy.'
            : 'This link has already been used or has expired.\nOpen the app to request a new one.'}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.btn,
            isSuccess ? styles.btnSuccess : styles.btnError,
            pressed && styles.btnPressed,
          ]}
          onPress={isSuccess ? handleContinue : handleTryAgain}>
          <Text style={styles.btnText}>
            {isSuccess ? 'Continue to app' : 'Request a new link'}
          </Text>
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
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSuccess: { backgroundColor: Palette.majorelleBlue },
  iconCircleError: { backgroundColor: '#c0392b' },
  iconText: { fontSize: 32, color: '#fff', fontWeight: '700' },
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
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  btnSuccess: { backgroundColor: Palette.majorelleBlue },
  btnError: { backgroundColor: '#c0392b' },
  btnPressed: { opacity: 0.8 },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
