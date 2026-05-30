import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Full-screen deep-space gradient (dark violet at the top fading to near-black). */
export function SpaceBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="space" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1a1340" />
          <Stop offset="0.55" stopColor="#0c0820" />
          <Stop offset="1" stopColor="#050410" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#space)" />
    </Svg>
  );
}
