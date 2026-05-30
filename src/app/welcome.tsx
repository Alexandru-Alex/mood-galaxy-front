import { Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Astronaut } from '@/components/astronaut';
import { Float } from '@/components/float';
import { PersonIcon } from '@/components/person-icon';
import { Starfield } from '@/components/starfield';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { styles } from '@/styles/welcome.styles';

export default function WelcomeScreen() {
  const [fontsLoaded] = useFonts({ Sora_700Bold });
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);

  const canContinue = name.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    // TODO: persist the name and route into the app once auth/flow is wired.
    console.log('Continue pressed, name:', name.trim());
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
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
                !canContinue && styles.btnDisabled,
                pressed && canContinue && styles.btnPressed,
              ]}
              onPress={handleContinue}
              disabled={!canContinue}>
              <Text style={styles.btnText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
