import { Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/google-button';
import { Starfield } from '@/components/starfield';
import { ThemedText } from '@/components/themed-text';
import { styles } from '@/styles/landing.styles';

export default function LandingScreen() {
  const [fontsLoaded] = useFonts({ Sora_700Bold });

  const handleGoogleSignIn = () => {
    // TODO: hook up Google OAuth (expo-auth-session) here.
    console.log('Continue with Google pressed');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Starfield />
      <SafeAreaView style={styles.safeArea}>
        <ThemedText
          type="title"
          style={[styles.title, !fontsLoaded && { fontFamily: undefined }]}>
          Mood Galaxy
        </ThemedText>
        <View style={styles.buttonWrap}>
          <GoogleButton onPress={handleGoogleSignIn} />
        </View>
      </SafeAreaView>
    </View>
  );
}
