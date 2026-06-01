import { Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AudioProvider } from '@/context/audio-context';
import { getStoredToken } from '@/lib/api';

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    getStoredToken().then((token) => {
      const onLanding = segments[0] === 'landing';
      if (!token && !onLanding) {
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
          </Stack>
        </ThemeProvider>
      </AudioProvider>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
