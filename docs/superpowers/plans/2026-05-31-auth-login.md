# Auth Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Google + email/password auth (sign-in & sign-up) against a local backend at `localhost:8080`, using the same architecture as budgetGarden-front — a modal overlay on the landing screen.

**Architecture:** A reusable `AuthModal` component (slide-up animated modal) lives in `src/components/auth-modal.tsx` and is opened from the landing screen when the user taps either button. Token storage uses `expo-secure-store` on native and `localStorage` on web. A shared `src/lib/api.ts` handles all HTTP calls and token caching.

**Tech Stack:** expo-auth-session (Google OAuth web), @react-native-google-signin/google-signin (Google OAuth native), expo-crypto (SHA-256 password hashing), expo-secure-store (native token storage), react-native-reanimated (modal animation)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/api.ts` | Create | BASE_URL, token storage helpers, `api.post/get` client |
| `src/styles/auth-modal.styles.ts` | Create | Modal styles using Palette colors |
| `src/components/auth-modal.tsx` | Create | AuthModal component (tabs, email form, Google button) |
| `src/app/pending-verification.tsx` | Create | Screen shown after sign-up (email not yet verified) |
| `src/app/landing.tsx` | Modify | Import AuthModal, wire buttons, add boot-time token check |
| `src/app/_layout.tsx` | Modify | Register `pending-verification` Stack.Screen |

---

## Task 1: Install missing packages

**Files:**
- Modify: `package.json` (via npx expo install)

- [ ] **Step 1: Install packages**

```bash
cd D:/IdeaProjects/mood-galaxy
npx expo install expo-auth-session expo-crypto expo-secure-store @react-native-google-signin/google-signin
```

Expected output: packages added to `package.json` without peer-dep errors.

- [ ] **Step 2: Verify package.json contains new deps**

```bash
grep -E "expo-auth-session|expo-crypto|expo-secure-store|google-signin" package.json
```

Expected: 4 matching lines.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install auth dependencies"
```

---

## Task 2: Create `src/lib/api.ts`

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/api.ts` with this exact content:

```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEV_HOST =
  Platform.OS === 'web'
    ? 'localhost'
    : (process.env.EXPO_PUBLIC_DEV_HOST ??
       (Platform.OS === 'android' ? '10.0.2.2' : 'localhost'));

export const BASE_URL = __DEV__
  ? `http://${DEV_HOST}:8080`
  : (process.env.EXPO_PUBLIC_API_URL ?? 'https://mood-galaxy-backend.onrender.com');

let _tokenCache: string | null | undefined = undefined;

export async function getStoredToken(): Promise<string | null> {
  if (_tokenCache !== undefined) return _tokenCache;
  if (Platform.OS === 'web') {
    _tokenCache = localStorage.getItem('auth_token');
  } else {
    _tokenCache = await SecureStore.getItemAsync('auth_token');
  }
  return _tokenCache ?? null;
}

export function invalidateTokenCache(): void {
  _tokenCache = undefined;
}

export async function saveToken(token: string): Promise<void> {
  _tokenCache = token;
  if (Platform.OS === 'web') {
    localStorage.setItem('auth_token', token);
  } else {
    await SecureStore.setItemAsync('auth_token', token);
  }
}

export async function logout(): Promise<void> {
  _tokenCache = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('is_new_user');
    localStorage.removeItem('pending_email');
  } else {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('is_new_user');
    await SecureStore.deleteItemAsync('pending_email');
  }
}

export async function getPendingEmail(): Promise<string> {
  if (Platform.OS === 'web') return localStorage.getItem('pending_email') ?? '';
  return (await SecureStore.getItemAsync('pending_email')) ?? '';
}

export async function clearPendingEmail(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem('pending_email');
  } else {
    await SecureStore.deleteItemAsync('pending_email');
  }
}

async function handleErrorResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => res.statusText);
  let message = text || res.statusText;
  try {
    const json = JSON.parse(text);
    if (json?.message) message = json.message;
  } catch {}
  throw new Error(message);
}

async function buildHeaders(withAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withAuth) {
    const token = await getStoredToken();
    if (token) headers['Authorization'] = token;
  }
  return headers;
}

export const api = {
  async post<T = unknown>(
    path: string,
    body: unknown,
    opts: { auth?: boolean } = {},
  ): Promise<T> {
    const { auth = true } = opts;
    const headers = await buildHeaders(auth);
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) return handleErrorResponse(res);
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  },

  async get<T = unknown>(path: string): Promise<T> {
    const headers = await buildHeaders();
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (!res.ok) return handleErrorResponse(res);
    return res.json() as Promise<T>;
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd D:/IdeaProjects/mood-galaxy && npx tsc --noEmit
```

Expected: no errors related to `src/lib/api.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add API client with token storage"
```

---

## Task 3: Create `src/styles/auth-modal.styles.ts`

**Files:**
- Create: `src/styles/auth-modal.styles.ts`

- [ ] **Step 1: Create the file**

```typescript
import { StyleSheet } from 'react-native';

import { Palette } from '@/constants/theme';

export const authStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropOverlay: {
    backgroundColor: 'rgba(10, 8, 40, 0.75)',
  },
  card: {
    backgroundColor: '#1a1440',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: Palette.dustyGrape + '55',
  },
  starStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  starEmoji: {
    fontSize: 16,
    color: Palette.mauve,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f3eefb',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Palette.brightLavender,
    textAlign: 'center',
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#0f1230',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Palette.majorelleBlue,
  },
  tabText: {
    color: Palette.brightLavender,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1230',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.dustyGrape + '66',
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapFocused: {
    borderColor: Palette.brightLavender,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#f3eefb',
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeText: {
    color: Palette.brightLavender,
    fontSize: 16,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: Palette.majorelleBlue,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnPressed: {
    opacity: 0.8,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.dustyGrape + '44',
  },
  dividerText: {
    color: Palette.brightLavender,
    marginHorizontal: 12,
    fontSize: 13,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 50,
  },
  googleBtnPressed: {
    opacity: 0.85,
  },
  googleText: {
    color: '#1c1a3a',
    fontSize: 15,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/auth-modal.styles.ts
git commit -m "feat: add auth modal styles"
```

---

## Task 4: Create `src/components/auth-modal.tsx`

**Files:**
- Create: `src/components/auth-modal.tsx`

This component handles Google OAuth (web via `expo-auth-session`, native via `@react-native-google-signin`) and email/password (sign-in + sign-up). Password is SHA-256 hashed before sending.

- [ ] **Step 1: Create the file**

```typescript
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
      // Close modal before native intent — RN Modal has higher Z-order than the account picker
      onClose();
      await new Promise(resolve => setTimeout(resolve, 150));
      await GoogleSignin.signOut().catch(() => {});
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      await handleGoogleToken(tokens.accessToken);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Try again.');
      setLoading(false);
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
              <MailIcon size={18} color={Palette.brightLavender} style={auth.inputIcon} />
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
```

- [ ] **Step 2: Check TypeScript**

```bash
cd D:/IdeaProjects/mood-galaxy && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth-modal.tsx
git commit -m "feat: add AuthModal component with Google and email auth"
```

---

## Task 5: Create `src/app/pending-verification.tsx`

**Files:**
- Create: `src/app/pending-verification.tsx`

Simple screen shown after sign-up while the user's email is unverified.

- [ ] **Step 1: Create the file**

```typescript
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Float } from '@/components/float';
import { AstronautLanding } from '@/components/astronaut-landing';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { Palette } from '@/constants/theme';
import { logout } from '@/lib/api';

export default function PendingVerificationScreen() {
  const router = useRouter();

  const handleBackToLogin = async () => {
    await logout();
    router.replace('/landing');
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
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pending-verification.tsx
git commit -m "feat: add pending-verification screen"
```

---

## Task 6: Update `src/app/_layout.tsx`

**Files:**
- Modify: `src/app/_layout.tsx`

Register the new `pending-verification` screen in the Stack navigator.

- [ ] **Step 1: Replace the file content**

```typescript
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack initialRouteName="landing" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="landing" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="pending-verification" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: register pending-verification route"
```

---

## Task 7: Update `src/app/landing.tsx`

**Files:**
- Modify: `src/app/landing.tsx`

Wire up `AuthModal`, add boot-time token check, replace TODO handlers.

- [ ] **Step 1: Replace the file content**

```typescript
import { Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
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
import { getStoredToken } from '@/lib/api';
import { styles } from '@/styles/landing.styles';

export default function LandingScreen() {
  const [fontsLoaded] = useFonts({ Sora_700Bold });
  const [authVisible, setAuthVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getStoredToken().then(async (token) => {
      if (!token) return;
      const pendingEmail =
        Platform.OS === 'web'
          ? localStorage.getItem('pending_email')
          : await SecureStore.getItemAsync('pending_email');
      if (pendingEmail) {
        router.replace('/pending-verification');
        return;
      }
      const isNew =
        Platform.OS === 'web'
          ? localStorage.getItem('is_new_user')
          : await SecureStore.getItemAsync('is_new_user');
      router.replace(isNew === 'true' ? '/welcome' : '/dashboard');
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      <SafeAreaView style={styles.safeArea}>
        <StarCircle size={240} count={8}>
          <Float amplitude={10} duration={2200}>
            <AstronautLanding width={150} height={131} />
          </Float>
        </StarCircle>

        <View style={styles.header}>
          <ThemedText
            type="title"
            style={[styles.title, !fontsLoaded && { fontFamily: undefined }]}>
            Mood Galaxy
          </ThemedText>
          <Text style={styles.subtitle}>Your feelings, one star at a time</Text>
        </View>

        <View style={styles.buttons}>
          <GoogleButton onPress={() => setAuthVisible(true)} />
          <EmailButton onPress={() => setAuthVisible(true)} />
        </View>

        <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy</Text>
      </SafeAreaView>

      <AuthModal
        visible={authVisible}
        onClose={() => setAuthVisible(false)}
        onSuccess={(newUser, emailVerified = true) => {
          setAuthVisible(false);
          if (!emailVerified) {
            router.replace('/pending-verification');
          } else {
            router.replace(newUser ? '/welcome' : '/dashboard');
          }
        }}
      />
    </View>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd D:/IdeaProjects/mood-galaxy && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/landing.tsx
git commit -m "feat: wire AuthModal and boot redirect into landing screen"
```

---

## Task 8: Manual smoke test

- [ ] **Step 1: Start backend** — ensure `localhost:8080` is running (mood-galaxy-backend).

- [ ] **Step 2: Start Expo**

```bash
cd D:/IdeaProjects/mood-galaxy && npx expo start --web
```

- [ ] **Step 3: Test email sign-up flow**
  1. Open browser → landing screen shows
  2. Tap "Continue with Email" → AuthModal slides up
  3. Switch to "Sign Up" tab
  4. Enter valid email + password meeting requirements + confirm
  5. Tap "Create Account"
  6. Expected: redirected to `/pending-verification`

- [ ] **Step 4: Test email sign-in flow**
  1. Log out or clear storage → back to landing
  2. Tap button → modal → Sign In tab
  3. Enter credentials of a verified account
  4. Expected: redirected to `/dashboard` (or `/welcome` if new)

- [ ] **Step 5: Test Google flow (web)**
  1. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env.local`
  2. Tap modal → "Continue with Google"
  3. Complete Google OAuth popup
  4. Expected: redirected to `/dashboard` or `/welcome`

- [ ] **Step 6: Test boot redirect**
  1. Refresh page while logged in
  2. Expected: skips landing, goes directly to `/dashboard`

- [ ] **Step 7: Test validation errors**
  - Empty form → "Fill in all fields."
  - Invalid email → "Enter a valid email address."
  - Short password → "Password must be at least 6 characters."
  - Passwords mismatch → "Passwords do not match."

---

## Environment Variables

For Google OAuth to work, create `.env.local` (not committed) with:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<your-android-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>
```

On Android emulator, the backend is reachable at `10.0.2.2:8080` automatically. For a physical device, set:

```
EXPO_PUBLIC_DEV_HOST=<your-pc-lan-ip>
```
