import * as Crypto from 'expo-crypto';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GoogleLogo } from '@/components/google-logo';
import { MailIcon } from '@/components/mail-icon';
import { Palette } from '@/constants/theme';
import { api, BASE_URL, saveToken } from '@/lib/api';
import { authStyles as auth } from '@/styles/auth-modal.styles';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
};

type AuthModalProps = {
  visible: boolean;
  onClose: () => void;
  /** emailVerified=undefined means no email check needed (Google path) */
  onSuccess: (newUser: boolean, emailVerified?: boolean) => void;
};

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    ...GOOGLE_CLIENT_IDS,
    redirectUri: makeRedirectUri({ scheme: 'moodgalaxy', path: 'auth' }),
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken;
      if (token) handleGoogleToken(token);
    }
  }, [googleResponse]);

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

  const handleNativeGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      setLoading(false);
      // Close modal before native intent — RN Modal has higher Z-order than the account picker
      onClose();
      await new Promise(resolve => setTimeout(resolve, 150));
      await GoogleSignin.signOut().catch(() => {});
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      await handleGoogleToken(tokens.accessToken);
    } catch (e: unknown) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Try again.');
    }
  };

  const handleGoogleToken = async (accessToken: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post<{ token: string; newUser: boolean }>(
        '/authorization-google',
        { token: accessToken, provider: 'google' },
        { auth: false },
      );
      await saveToken(data.token);
      if (Platform.OS === 'web') {
        localStorage.setItem('is_new_user', String(data.newUser));
      } else {
        await SecureStore.setItemAsync('is_new_user', String(data.newUser));
      }
      onSuccess(data.newUser);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Fill in all fields.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'signup') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (!/\d/.test(password)) { setError('Password must contain at least one digit.'); return; }
      if (!/[^a-zA-Z0-9]/.test(password)) {
        setError('Password must contain at least one special character.');
        return;
      }
      if (!confirmPassword) { setError('Confirm password.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }
    setLoading(true);
    try {
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
      );
      if (mode === 'signup') {
        const data = await api.post<{ token: string; newUser: boolean }>(
          '/sign-up',
          { email, password: hashedPassword },
          { auth: false },
        );
        await saveToken(data.token);
        if (Platform.OS === 'web') {
          localStorage.setItem('is_new_user', String(data.newUser));
          localStorage.setItem('pending_email', email);
        } else {
          await SecureStore.setItemAsync('is_new_user', String(data.newUser));
          await SecureStore.setItemAsync('pending_email', email);
        }
        onSuccess(data.newUser, false);
      } else {
        const data = await api.post<{ token: string; newUser: boolean }>(
          '/sign-in',
          { email, password: hashedPassword },
          { auth: false },
        );
        await saveToken(data.token);
        // Check email verification: 403 with "not verified" means pending
        const checkRes = await fetch(`${BASE_URL}/accounts`, {
          headers: { Authorization: data.token },
        });
        if (checkRes.status === 403) {
          const text = await checkRes.text().catch(() => '');
          let msg = text;
          try { msg = JSON.parse(text)?.message ?? text; } catch {}
          if (msg.toLowerCase().includes('not verified')) {
            if (Platform.OS === 'web') {
              localStorage.setItem('pending_email', email);
            } else {
              await SecureStore.setItemAsync('pending_email', email);
            }
            onSuccess(false, false);
            return;
          }
        }
        onSuccess(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const cardY = useSharedValue(60);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      cardY.value = withSpring(0, { damping: 18, stiffness: 200 });
      cardOpacity.value = withTiming(1, { duration: 220 });
    } else {
      cardY.value = withTiming(60, { duration: 180 });
      cardOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, auth.backdropOverlay]} onPress={onClose} />
      <KeyboardAvoidingView style={auth.backdrop} behavior="padding" pointerEvents="box-none">
        <Animated.View style={[auth.card, cardStyle]}>
          <View style={auth.starStrip}>
            {['✦', '★', '✦', '★', '✦'].map((s, i) => (
              <Text key={i} style={auth.starEmoji}>{s}</Text>
            ))}
          </View>

          <ScrollView contentContainerStyle={auth.scroll} keyboardShouldPersistTaps="handled">
            <Text style={auth.title}>
              {mode === 'login' ? 'Welcome back ✦' : 'Join the galaxy ✦'}
            </Text>
            <Text style={auth.subtitle}>
              {mode === 'login' ? 'Sign in to your universe' : 'Create your Mood Galaxy'}
            </Text>

            <View style={auth.tabs}>
              <Pressable
                style={[auth.tab, mode === 'login' && auth.tabActive]}
                onPress={() => { setMode('login'); setError(''); setConfirmPassword(''); }}>
                <Text style={[auth.tabText, mode === 'login' && auth.tabTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[auth.tab, mode === 'signup' && auth.tabActive]}
                onPress={() => { setMode('signup'); setError(''); setConfirmPassword(''); }}>
                <Text style={[auth.tabText, mode === 'signup' && auth.tabTextActive]}>Sign Up</Text>
              </Pressable>
            </View>

            {/* Email input */}
            <View style={[auth.inputWrap, emailFocused && auth.inputWrapFocused]}>
              <View style={auth.inputIcon}>
                <MailIcon size={18} color={Palette.brightLavender} />
              </View>
              <TextInput
                style={auth.input}
                placeholder="Email"
                placeholderTextColor={Palette.dustyGrape}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password input */}
            <View style={[auth.inputWrap, passwordFocused && auth.inputWrapFocused]}>
              <TextInput
                style={auth.input}
                placeholder="Password"
                placeholderTextColor={Palette.dustyGrape}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={auth.eyeBtn}>
                <Text style={auth.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>

            {/* Confirm password (sign-up only) */}
            {mode === 'signup' && (
              <View style={[auth.inputWrap, confirmFocused && auth.inputWrapFocused]}>
                <TextInput
                  style={auth.input}
                  placeholder="Confirm password"
                  placeholderTextColor={Palette.dustyGrape}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirm(v => !v)} style={auth.eyeBtn}>
                  <Text style={auth.eyeText}>{showConfirm ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
            )}

            {error ? <Text style={auth.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [auth.submitBtn, pressed && auth.submitBtnPressed]}
              onPress={handleSubmit}
              disabled={loading}>
              <Text style={auth.submitText}>
                {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            </Pressable>

            <View style={auth.divider}>
              <View style={auth.dividerLine} />
              <Text style={auth.dividerText}>or</Text>
              <View style={auth.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [auth.googleBtn, pressed && auth.googleBtnPressed]}
              onPress={() =>
                Platform.OS === 'web' ? googlePromptAsync() : handleNativeGoogleSignIn()
              }
              disabled={loading || (Platform.OS === 'web' && !googleRequest)}>
              <GoogleLogo size={20} />
              <Text style={auth.googleText}>Continue with Google</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
