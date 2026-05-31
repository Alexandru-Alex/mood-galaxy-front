import { Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { Redirect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Astronaut } from '@/components/astronaut';
import { Float } from '@/components/float';
import { PersonIcon } from '@/components/person-icon';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { api } from '@/lib/api';
import { styles } from '@/styles/welcome.styles';

export default function WelcomeScreen() {
  const [fontsLoaded] = useFonts({ Sora_700Bold });
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState<boolean | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsNewUser(localStorage.getItem('is_new_user') === 'true');
    } else {
      SecureStore.getItemAsync('is_new_user').then((v) => setIsNewUser(v === 'true'));
    }
  }, []);

  if (isNewUser === undefined) return null;
  if (!isNewUser) return <Redirect href="/dashboard" />;

  const canContinue = name.trim().length > 0;

  const handleContinue = async () => {
    if (!canContinue || loading) return;
    setLoading(true);
    try {
      await api.patch('/accounts', { name: name.trim() });
      if (Platform.OS === 'web') {
        localStorage.setItem('is_new_user', 'false');
      } else {
        await SecureStore.setItemAsync('is_new_user', 'false');
      }
      router.replace('/dashboard');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <ThemedText
              type="title"
              style={[styles.title, !fontsLoaded && { fontFamily: undefined }]}>
              Welcome!
            </ThemedText>
          </View>

          <View style={styles.greet}>
            <Float amplitude={12} duration={2000}>
              <Astronaut width={130} height={122} />
            </Float>
            <View style={styles.bubbleWrap}>
              <View style={styles.tailOuter} />
              <View style={styles.tailInner} />
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>What should we call you?</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
              <View style={styles.inputIcon}>
                <PersonIcon size={18} color={Palette.brightLavender} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Palette.dustyGrape}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                underlineColorAndroid="transparent"
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                (!canContinue || loading) && styles.btnDisabled,
                pressed && canContinue && !loading && styles.btnPressed,
              ]}
              onPress={handleContinue}
              disabled={!canContinue || loading}>
              {loading ? (
                <ActivityIndicator color={Palette.white} />
              ) : (
                <Text style={styles.btnText}>Continue</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
