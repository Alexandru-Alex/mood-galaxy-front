import { Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AstronautLanding } from '@/components/astronaut-landing';
import { EmailButton } from '@/components/email-button';
import { Float } from '@/components/float';
import { GoogleButton } from '@/components/google-button';
import { SpaceBackground } from '@/components/space-background';
import { StarCircle } from '@/components/star-circle';
import { Starfield } from '@/components/starfield';
import { ThemedText } from '@/components/themed-text';
import { styles } from '@/styles/landing.styles';

export default function LandingScreen() {
  const [fontsLoaded] = useFonts({ Sora_700Bold });

  const handleGoogleSignIn = () => {
    // TODO: hook up Google OAuth (expo-auth-session) here.
    console.log('Continue with Google pressed');
  };

  const handleEmailSignIn = () => {
    // TODO: route to the email sign-in flow.
    console.log('Continue with Email pressed');
  };

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
          <GoogleButton onPress={handleGoogleSignIn} />
          <EmailButton onPress={handleEmailSignIn} />
        </View>

        <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy</Text>
      </SafeAreaView>
    </View>
  );
}
