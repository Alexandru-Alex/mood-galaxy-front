import { Image } from 'expo-image';

type AstronautLandingProps = {
  width?: number;
  height?: number;
};

export function AstronautLanding({ width = 229, height = 200 }: AstronautLandingProps) {
  return (
    <Image
      source={require('@/assets/images/astronaut-landing.png')}
      style={{ width, height }}
      contentFit="contain"
    />
  );
}
