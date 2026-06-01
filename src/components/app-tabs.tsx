import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

type TabIconProps = TabTriggerSlotProps & {
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
};

function TabIconButton({ isFocused, icon, iconOutline, ...props }: TabIconProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabBtn, pressed && { opacity: 0.6 }]}
    >
      <Ionicons
        name={isFocused ? icon : iconOutline}
        size={26}
        color={isFocused ? Palette.brightLavender : 'rgba(255,255,255,0.38)'}
      />
    </Pressable>
  );
}

function BottomBar({ children, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      {children}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <BottomBar>
          <TabTrigger name="index" href="/" asChild>
            <TabIconButton icon="home" iconOutline="home-outline" />
          </TabTrigger>
          <TabTrigger name="galaxy" href="/galaxy" asChild>
            <TabIconButton icon="planet" iconOutline="planet-outline" />
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabIconButton icon="compass" iconOutline="compass-outline" />
          </TabTrigger>
          <TabTrigger name="you" href="/you" asChild>
            <TabIconButton icon="person" iconOutline="person-outline" />
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 4, 16, 0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(171, 129, 205, 0.25)',
    paddingTop: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
});
