import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ENABLED_KEY = 'coinlab_notifications_enabled';
export const ANDROID_CHANNEL_ID = 'default';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

// Android 13+ only shows the permission prompt once a channel exists.
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'CoinLab',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Asks the OS for notification permission (if still askable). Resolves the resulting state. */
export async function requestPermission(): Promise<PermissionState> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  return toState(await Notifications.requestPermissionsAsync());
}

/** The user's in-app choice; defaults to on. Reminders only fire if the OS permission is also granted. */
export async function loadNotificationsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'false';
  } catch {
    return true;
  }
}

export async function saveNotificationsEnabled(enabled: boolean) {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}
