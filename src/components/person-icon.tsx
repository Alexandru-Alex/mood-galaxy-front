import Svg, { Path } from 'react-native-svg';

type PersonIconProps = {
  size?: number;
  color?: string;
};

/** Simple person/user glyph, rendered as SVG so it works on every platform. */
export function PersonIcon({ size = 18, color = '#ffffff' }: PersonIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      />
    </Svg>
  );
}
