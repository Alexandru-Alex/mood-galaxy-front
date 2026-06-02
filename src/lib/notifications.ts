import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const HOUR_KEY = 'notif_hour';
const ENABLED_KEY = 'notif_enabled';
const DEFAULT_HOUR = 20;
const CHANNEL_ID = 'daily-reminder';

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily Reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function getSavedHour(): Promise<number> {
  if (Platform.OS === 'web') return DEFAULT_HOUR;
  const stored = await SecureStore.getItemAsync(HOUR_KEY);
  if (stored === null) return DEFAULT_HOUR;
  const parsed = parseInt(stored, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_HOUR;
}

export async function saveHour(hour: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(HOUR_KEY, String(hour));
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDaily(hour: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Mood Galaxy 🌌',
      body: "Don't forget to log your mood today!",
      ...(Platform.OS === 'android' ? { android: { channelId: CHANNEL_ID } } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: 0,
    },
  });
}

export async function cancelAll(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function setEnabledFlag(value: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(ENABLED_KEY, value ? '1' : '0');
}
