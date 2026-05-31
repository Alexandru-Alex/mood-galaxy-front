import { Image } from 'expo-image';

type AstronautProps = {
  width?: number;
  height?: number;
};

export function Astronaut({ width = 200, height = 187 }: AstronautProps) {
  return (
    <Image
      source={require('@/assets/images/astronaut.png')}
      style={{ width, height }}
      contentFit="contain"
    />
  );
}
