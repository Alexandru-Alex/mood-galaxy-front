import { BASE_URL } from '@/lib/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace('/email-verified?success=false');
      return;
    }
    if (Platform.OS === 'web') {
      window.location.href = `${BASE_URL}/verify-email?token=${encodeURIComponent(String(token))}`;
    }
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Palette.brightLavender} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1230' },
});
