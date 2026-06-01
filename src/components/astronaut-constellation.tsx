import { Image } from 'expo-image';

type Props = {
  width?: number;
  height?: number;
};

export function AstronautConstellation({ width = 60, height = 60 }: Props) {
  return (
    <Image
      source={require('@/assets/images/astronaut-constellation.png')}
      style={{ width, height }}
      contentFit="contain"
    />
  );
}
