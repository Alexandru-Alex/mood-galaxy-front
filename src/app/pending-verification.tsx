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
