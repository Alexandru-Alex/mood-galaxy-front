import { Platform, StyleSheet } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050410',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
    ...Platform.select({
      web: {
        textShadowColor: Palette.majorelleBlue,
        textShadowRadius: 24,
        textShadowOffset: { width: 0, height: 0 },
      },
      default: {
        textShadowColor: 'rgba(180, 160, 255, 1)',
        textShadowRadius: 22,
        textShadowOffset: { width: 0, height: 1 },
      },
    }),
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.brightLavender,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  buttons: {
    width: '100%',
    maxWidth: 360,
    gap: Spacing.three,
  },
  terms: {
    fontSize: 11,
    color: Palette.dustyGrape,
    textAlign: 'center',
    maxWidth: 300,
    letterSpacing: 0.2,
  },
  termsLink: {
    fontSize: 11,
    color: Palette.brightLavender,
    textDecorationLine: 'underline',
    letterSpacing: 0.2,
  },
  muteButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
});
