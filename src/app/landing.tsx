import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthModal } from '@/components/auth-modal';
import { AstronautLanding } from '@/components/astronaut-landing';
import { EmailButton } from '@/components/email-button';
import { Float } from '@/components/float';
import { GoogleButton } from '@/components/google-button';
import { SpaceBackground } from '@/components/space-background';
import { StarCircle } from '@/components/star-circle';
import { Starfield } from '@/components/starfield';
import { ThemedText } from '@/components/themed-text';
import { useAudio } from '@/context/audio-context';
import { SoundIcon } from '@/components/sound-icon';
import { api, getStoredToken, getPendingEmail, saveToken, saveGalaxySeed, setIsNewUserCache } from '@/lib/api';
import { styles } from '@/styles/landing.styles';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
};

export default function LandingScreen() {
  const [authVisible, setAuthVisible] = useState(false);
  const [authMounted, setAuthMounted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { isMuted, toggleMute } = useAudio();
  const [heavyReady, setHeavyReady] = useState(false);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    // defer heavy SVG + starfield rendering until after first painted frame
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => setHeavyReady(true));
    });
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, []);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    ...GOOGLE_CLIENT_IDS,
    redirectUri: makeRedirectUri({ scheme: 'moodgalaxy', path: 'auth' }),
  });

  // Boot redirect: skip landing if already authenticated
  useEffect(() => {
    getStoredToken().then(async (token) => {
      if (!token) return;
      const pendingEmail = await getPendingEmail();
      if (pendingEmail) {
        router.replace('/pending-verification');
        return;
      }
      const isNew =
        Platform.OS === 'web'
          ? localStorage.getItem('is_new_user')
          : await SecureStore.getItemAsync('is_new_user');
      router.replace(isNew === 'true' ? '/welcome' : '/');
    });
  }, []);

  // Handle Google OAuth response (web flow)
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken;
      if (token) handleGoogleToken(token);
    }
  }, [googleResponse]);

  // Configure native Google Sign-In SDK
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: GOOGLE_CLIENT_IDS.webClientId,
        iosClientId: GOOGLE_CLIENT_IDS.iosClientId,
        offlineAccess: false,
      });
    }
  }, []);

  const handleGoogleToken = async (accessToken: string) => {
    setGoogleLoading(true);
    try {
      const data = await api.post<{ token: string; newUser: boolean; seed?: number }>(
        '/authorization-google',
        { token: accessToken, provider: 'google' },
        { auth: false },
      );
      await saveToken(data.token);
      if (data.seed !== undefined) await saveGalaxySeed(data.seed);
      if (Platform.OS === 'web') {
        localStorage.setItem('is_new_user', String(data.newUser));
      } else {
        await SecureStore.setItemAsync('is_new_user', String(data.newUser));
      }
      setIsNewUserCache(data.newUser);
      router.replace(data.newUser ? '/welcome' : '/');
    } catch (e: unknown) {
      console.error('Google auth error:', e);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleNativeGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      setGoogleLoading(false);
      await GoogleSignin.signOut().catch(() => {});
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      await handleGoogleToken(tokens.accessToken);
    } catch (e: unknown) {
      setGoogleLoading(false);
      console.error('Native Google sign-in error:', e);
    }
  };

  const handleGooglePress = () => {
    if (Platform.OS === 'web') {
      googlePromptAsync();
    } else {
      handleNativeGoogleSignIn();
    }
  };

  const handleAuthSuccess = (newUser: boolean, emailVerified = true) => {
    setAuthVisible(false);
    if (!emailVerified) {
      router.replace('/pending-verification');
    } else {
      router.replace(newUser ? '/welcome' : '/');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      {heavyReady && <Starfield />}
      {Platform.OS !== 'web' && (
        <Pressable style={styles.muteButton} onPress={toggleMute}>
          <SoundIcon muted={isMuted} />
        </Pressable>
      )}
      <SafeAreaView style={styles.safeArea}>
        <StarCircle size={240} count={8}>
          {heavyReady && (
            <Float amplitude={10} duration={2200}>
              <AstronautLanding width={150} height={131} />
            </Float>
          )}
        </StarCircle>

        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Mood Galaxy
          </ThemedText>
          <Text style={styles.subtitle}>Your feelings, one star at a time</Text>
        </View>

        <View style={styles.buttons}>
          <GoogleButton
            onPress={handleGooglePress}
            disabled={googleLoading || (Platform.OS === 'web' && !googleRequest)}
          />
          <EmailButton onPress={() => { setAuthMounted(true); setAuthVisible(true); }} />
        </View>

        <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy</Text>
      </SafeAreaView>

      {authMounted && (
        <AuthModal
          visible={authVisible}
          onClose={() => setAuthVisible(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </View>
  );
}
