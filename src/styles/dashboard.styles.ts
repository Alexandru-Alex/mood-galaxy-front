import { StyleSheet } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050410',
  },
  tapLayer: {
    flex: 1,
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  hudTop: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  counter: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.mauve,
    letterSpacing: 1,
  },
  hint: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.brightLavender,
    letterSpacing: 0.3,
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(171, 129, 205, 0.5)',
    backgroundColor: 'rgba(30, 24, 58, 0.6)',
    borderRadius: Spacing.six,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.mauve,
    letterSpacing: 0.5,
  },
});
