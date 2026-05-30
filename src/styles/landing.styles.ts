import { StyleSheet } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.six,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    color: Palette.mauve,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: Palette.majorelleBlue,
    textShadowRadius: 24,
  },
  buttonWrap: {
    width: '100%',
    maxWidth: 360,
  },
});
