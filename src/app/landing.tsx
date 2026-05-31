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
import { getStoredToken, getPendingEmail } from '@/lib/api';
import { styles } from '@/styles/landing.styles';

export default function LandingScreen() {
  const [fontsLoaded] = useFonts({ Sora_700Bold });
  const [authVisible, setAuthVisible] = useState(false);
  const router = useRouter();

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
