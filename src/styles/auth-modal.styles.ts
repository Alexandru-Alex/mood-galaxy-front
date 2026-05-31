import { StyleSheet } from 'react-native';

import { Palette } from '@/constants/theme';

export const authStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropOverlay: {
    backgroundColor: 'rgba(10, 8, 40, 0.75)',
  },
  card: {
    backgroundColor: '#1a1440',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: Palette.dustyGrape + '55',
  },
  starStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  starEmoji: {
    fontSize: 16,
    color: Palette.mauve,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f3eefb',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Palette.brightLavender,
    textAlign: 'center',
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#0f1230',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Palette.majorelleBlue,
  },
  tabText: {
    color: Palette.brightLavender,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1230',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.dustyGrape + '66',
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapFocused: {
    borderColor: Palette.brightLavender,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#f3eefb',
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeText: {
    color: Palette.brightLavender,
    fontSize: 16,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: Palette.majorelleBlue,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnPressed: {
    opacity: 0.8,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.dustyGrape + '44',
  },
  dividerText: {
    color: Palette.brightLavender,
    marginHorizontal: 12,
    fontSize: 13,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 50,
  },
  googleBtnPressed: {
    opacity: 0.85,
  },
  googleText: {
    color: '#1c1a3a',
    fontSize: 15,
    fontWeight: '600',
  },
});
