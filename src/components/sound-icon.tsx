import Svg, { Path } from 'react-native-svg';

type SoundIconProps = {
  muted?: boolean;
  size?: number;
  color?: string;
};

export function SoundIcon({ muted = false, size = 22, color = '#a78bfa' }: SoundIconProps) {
  if (muted) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Speaker body */}
        <Path
          d="M11 5L6 9H2v6h4l5 4V5z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* X cross */}
        <Path
          d="M17 9l6 6M23 9l-6 6"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Speaker body */}
      <Path
        d="M11 5L6 9H2v6h4l5 4V5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Small wave */}
      <Path
        d="M15.54 8.46a5 5 0 0 1 0 7.07"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Big wave */}
      <Path
        d="M19.07 4.93a10 10 0 0 1 0 14.14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
