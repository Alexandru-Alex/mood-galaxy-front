/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Mood Galaxy brand palette. Use these raw values for accents, gradients and
 * decorative galaxy elements. For UI surfaces/text prefer the semantic tokens
 * in `Colors` below so light/dark mode stays consistent.
 */
export const Palette = {
  /** Majorelle Blue — primary brand color, creative & elegant. */
  majorelleBlue: '#574ae2',
  /** Imperial Blue — deep, noble blue; great for dark backgrounds. */
  imperialBlue: '#222a68',
  /** Dusty Grape — understated, velvety secondary. */
  dustyGrape: '#654597',
  /** Bright Lavender — playful, attention-grabbing accent. */
  brightLavender: '#ab81cd',
  /** Mauve — soft pastel highlight. */
  mauve: '#e2adf2',
} as const;

export type PaletteColor = keyof typeof Palette;

export const Colors = {
  light: {
    text: '#1c1a3a',
    background: '#ffffff',
    backgroundElement: '#f4f1fb',
    backgroundSelected: '#e8e1f6',
    textSecondary: '#615b86',
    tint: Palette.majorelleBlue,
    primary: Palette.majorelleBlue,
    secondary: Palette.dustyGrape,
    accent: Palette.brightLavender,
    highlight: Palette.mauve,
    border: '#ddd6ef',
  },
  dark: {
    text: '#f3eefb',
    background: '#0f1230',
    backgroundElement: Palette.imperialBlue,
    backgroundSelected: '#2e3680',
    textSecondary: '#b9b3d6',
    tint: Palette.brightLavender,
    primary: Palette.majorelleBlue,
    secondary: Palette.dustyGrape,
    accent: Palette.brightLavender,
    highlight: Palette.mauve,
    border: '#2e3680',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
