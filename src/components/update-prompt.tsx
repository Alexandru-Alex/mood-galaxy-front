import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

import { Palette } from '@/constants/theme';

type State = 'idle' | 'ready';

export function UpdatePrompt() {
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    // expo-updates is disabled in development builds
    if (__DEV__) return;

    async function check() {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        await Updates.fetchUpdateAsync();
        setState('ready');
      } catch {
        // fail silently — never block the user
      }
    }

    check();
  }, []);

  if (state !== 'ready') return null;

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <View style={styles.dot} />
          </View>

          <Text style={styles.title}>Update available</Text>
          <Text style={styles.body}>
            A new version of Mood Galaxy is ready.{'\n'}
            Restart now to apply it.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
            onPress={() => Updates.reloadAsync()}
          >
            <Text style={styles.btnText}>✦ Restart now</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.laterBtn, pressed && { opacity: 0.5 }]}
            onPress={() => setState('idle')}
          >
            <Text style={styles.laterText}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#0f1230',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(171,129,205,0.25)',
    paddingHorizontal: 28,
    paddingVertical: 32,
    alignItems: 'center',
    shadowColor: Palette.brightLavender,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  iconRow: {
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.brightLavender,
    shadowColor: Palette.brightLavender,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    fontSize: 18,
    fontWeight: '300',
    color: '#f3eefb',
    letterSpacing: 1,
    marginBottom: 10,
  },
  body: {
    fontSize: 13,
    color: '#b9b3d6',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  btn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Palette.brightLavender,
    borderRadius: 32,
    paddingHorizontal: 32,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
    shadowColor: Palette.brightLavender,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 12,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.mauve,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  laterBtn: {
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 12,
    color: 'rgba(185,179,214,0.45)',
    letterSpacing: 0.5,
  },
});
