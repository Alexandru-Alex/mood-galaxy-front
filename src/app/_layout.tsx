import { Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Known expo-router bug: useLinking resolves the initial URL async and tries to
// update ContextNavigator state before React finishes mounting it. Dev-only, no
// runtime impact. https://github.com/expo/expo/issues/useLinking-race
LogBox.ignoreLogs(["Can't perform a React state update on a component that hasn't mounted yet"]);
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AudioProvider } from '@/context/audio-context';
import { VoidProvider } from '@/context/void-context';
import { getStoredToken } from '@/lib/api';


SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    getStoredToken().then((token) => {
      const publicRoutes = ['landing', 'verify-email', 'email-verified'];
      if (!token && !publicRoutes.includes(segments[0])) {
        router.replace('/landing');
      }
    });
  }, [segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ Sora_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AudioProvider>
        <VoidProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AuthGuard />
            <AnimatedSplashOverlay />
            <Stack initialRouteName="landing" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="landing" />
              <Stack.Screen name="welcome" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="pending-verification" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="galaxy" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="change-email" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="email-verified" />
            </Stack>
          </ThemeProvider>
        </VoidProvider>
      </AudioProvider>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
