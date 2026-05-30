import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Palette } from '@/constants/theme';

const HALO = 14;
const CORE = 5;

type StarCircleProps = {
  size?: number;
  count?: number;
  children?: ReactNode;
};

/** Places `count` glowing stars evenly on a circle, links them into a ring, and centers children inside. */
export function StarCircle({ size = 240, count = 8, children }: StarCircleProps) {
  const radius = size / 2 - HALO / 2 - 2;
  const points = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: size / 2 + radius * Math.cos(angle),
      y: size / 2 + radius * Math.sin(angle),
    };
  });
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Polygon
          points={polygonPoints}
          fill="none"
          stroke={Palette.brightLavender}
          strokeWidth={1}
          strokeOpacity={0.55}
          strokeLinejoin="round"
        />
      </Svg>
      {points.map((p, i) => (
        <View
          key={i}
          style={[styles.starWrap, { left: p.x - HALO / 2, top: p.y - HALO / 2 }]}
          pointerEvents="none">
          <View style={styles.halo} />
          <View style={styles.core} />
        </View>
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  starWrap: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: Palette.brightLavender,
    opacity: 0.25,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: '#ffffff',
  },
});
