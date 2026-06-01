import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
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
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { EyeIcon } from '@/components/eye-icon';
import { LockIcon } from '@/components/lock-icon';
import { MailIcon } from '@/components/mail-icon';
import { Palette } from '@/constants/theme';
import { api, BASE_URL, saveToken, saveGalaxySeed } from '@/lib/api';
import { authStyles as auth } from '@/styles/auth-modal.styles';

type AuthModalProps = {
  visible: boolean;
  onClose: () => void;
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

  const handleSubmit = async () => {
    setError('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();
    if (!trimmedEmail || !trimmedPassword) { setError('Fill in all fields.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'signup') {
      if (trimmedPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (!/\d/.test(trimmedPassword)) { setError('Password must contain at least one digit.'); return; }
      if (!/[^a-zA-Z0-9]/.test(trimmedPassword)) {
        setError('Password must contain at least one special character.');
        return;
      }
      if (!trimmedConfirm) { setError('Confirm password.'); return; }
      if (trimmedPassword !== trimmedConfirm) { setError('Passwords do not match.'); return; }
    }
    setLoading(true);
    try {
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        trimmedPassword,
      );
      if (mode === 'signup') {
        const data = await api.post<{ token: string; newUser: boolean; seed?: number }>(
          '/sign-up',
          { email: trimmedEmail, password: hashedPassword },
          { auth: false },
        );
        await saveToken(data.token);
        if (data.seed !== undefined) await saveGalaxySeed(data.seed);
        if (Platform.OS === 'web') {
          localStorage.setItem('is_new_user', String(data.newUser));
          localStorage.setItem('pending_email', trimmedEmail);
        } else {
          await SecureStore.setItemAsync('is_new_user', String(data.newUser));
          await SecureStore.setItemAsync('pending_email', trimmedEmail);
        }
        onSuccess(data.newUser, false);
      } else {
        const data = await api.post<{ token: string; newUser: boolean; seed?: number }>(
          '/sign-in',
          { email: trimmedEmail, password: hashedPassword },
          { auth: false },
        );
        await saveToken(data.token);
        if (data.seed !== undefined) await saveGalaxySeed(data.seed);
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
              localStorage.setItem('pending_email', trimmedEmail);
            } else {
              await SecureStore.setItemAsync('pending_email', trimmedEmail);
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

  const emailFocus = useSharedValue(0);
  const passwordFocus = useSharedValue(0);
  const confirmFocus = useSharedValue(0);

  const emailWrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(emailFocus.value, [0, 1], [`${Palette.dustyGrape}66`, Palette.brightLavender]),
    shadowOpacity: emailFocus.value * 0.25,
  }));
  const passwordWrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(passwordFocus.value, [0, 1], [`${Palette.dustyGrape}66`, Palette.brightLavender]),
    shadowOpacity: passwordFocus.value * 0.25,
  }));
  const confirmWrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(confirmFocus.value, [0, 1], [`${Palette.dustyGrape}66`, Palette.brightLavender]),
    shadowOpacity: confirmFocus.value * 0.25,
  }));

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
      <Pressable style={[StyleSheet.absoluteFill, auth.backdropOverlay]} onPress={onClose}>
        <KeyboardAvoidingView style={auth.backdrop} behavior="padding">
          <Animated.View
            style={[auth.card, cardStyle]}
            onStartShouldSetResponder={() => true}
            {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation() } : {})}
          >
          <View style={auth.starStrip}>
            {['✦', '★', '✦', '★', '✦'].map((s, i) => (
              <Text key={`${s}-${i}`} style={auth.starEmoji}>{s}</Text>
            ))}
          </View>

          <ScrollView contentContainerStyle={auth.scroll} keyboardShouldPersistTaps="always">
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
            <Animated.View style={[auth.inputWrap, emailWrapStyle]}>
              <View style={auth.inputIcon}>
                <MailIcon size={18} color={Palette.brightLavender} />
              </View>
              <TextInput
                style={auth.input}
                placeholder="Email"
                placeholderTextColor={Palette.dustyGrape}
                value={email}
                onChangeText={setEmail}
                onFocus={() => { emailFocus.value = withTiming(1, { duration: 150 }); }}
                onBlur={() => { emailFocus.value = withTiming(0, { duration: 150 }); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </Animated.View>

            {/* Password input */}
            <Animated.View style={[auth.inputWrap, passwordWrapStyle]}>
              <View style={auth.inputIcon}>
                <LockIcon size={18} color={Palette.brightLavender} />
              </View>
              <TextInput
                style={auth.input}
                placeholder="Password"
                placeholderTextColor={Palette.dustyGrape}
                value={password}
                onChangeText={setPassword}
                onFocus={() => { passwordFocus.value = withTiming(1, { duration: 150 }); }}
                onBlur={() => { passwordFocus.value = withTiming(0, { duration: 150 }); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                blurOnSubmit={false}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={auth.eyeBtn}>
                <EyeIcon size={18} color={Palette.brightLavender} off={showPassword} />
              </Pressable>
            </Animated.View>

            {/* Confirm password (sign-up only) */}
            {mode === 'signup' && (
              <Animated.View style={[auth.inputWrap, confirmWrapStyle]}>
                <View style={auth.inputIcon}>
                  <LockIcon size={18} color={Palette.brightLavender} />
                </View>
                <TextInput
                  style={auth.input}
                  placeholder="Confirm password"
                  placeholderTextColor={Palette.dustyGrape}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => { confirmFocus.value = withTiming(1, { duration: 150 }); }}
                  onBlur={() => { confirmFocus.value = withTiming(0, { duration: 150 }); }}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
                <Pressable onPress={() => setShowConfirm(v => !v)} style={auth.eyeBtn}>
                  <EyeIcon size={18} color={Palette.brightLavender} off={showConfirm} />
                </Pressable>
              </Animated.View>
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
          </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
