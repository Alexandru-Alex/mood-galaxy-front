import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Constellation, type StarPoint } from '@/components/constellation';
import { SpaceBackground } from '@/components/space-background';
import { Starfield } from '@/components/starfield';
import { styles } from '@/styles/dashboard.styles';

const MAX_STARS = 7;

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stars, setStars] = useState<StarPoint[]>([]);

  const complete = stars.length >= MAX_STARS;

  const handleTap = (e: GestureResponderEvent) => {
    if (complete) return;
    const { locationX, locationY } = e.nativeEvent;
    setStars((prev) => (prev.length >= MAX_STARS ? prev : [...prev, { x: locationX, y: locationY }]));
  };

  const reset = () => setStars([]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SpaceBackground />
      <Starfield />

      <View
        style={styles.tapLayer}
        onStartShouldSetResponder={() => !complete}
        onResponderRelease={handleTap}>
        <Constellation stars={stars} complete={complete} />
      </View>

      <View
        style={[styles.hud, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        pointerEvents="box-none">
        <View style={styles.hudTop} pointerEvents="none">
          <Text style={styles.counter}>
            {stars.length} / {MAX_STARS}
          </Text>
          <Text style={styles.hint}>
            {complete ? 'Constellation complete ✦' : 'Tap to create your constellation'}
          </Text>
        </View>

        {stars.length > 0 && (
          <Pressable style={styles.reset} onPress={reset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        )}
        {__DEV__ && (
          <Pressable style={styles.reset} onPress={() => router.push('/galaxy')}>
            <Text style={styles.resetText}>Galaxy ✦</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
