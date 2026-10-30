import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { translate } from '@/i18n/translate';
import type { Language } from '@/i18n/translate';

const ENABLED_KEY = 'coinlab_notifications_enabled';
// Android fixes a channel's settings (importance, vibration) once it exists, so changing them means
// a new id. The old channels are removed once no pending reminder points at them.
export const STREAK_CHANNEL_ID = 'streak-reminders-v2';
const LEGACY_CHANNEL_IDS = [
  'default',
  'streak-reminders',
  // "Miscellaneous": expo-notifications creates it for a notification whose channel doesn't exist.
  'expo_notifications_fallback_notification_channel',
];

export type PermissionState = 'granted' | 'denied' | 'undetermined';

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

/**
 * Creates the streak reminder channel, or renames it to match `language`. Android 13+ only shows
 * the permission prompt once a channel exists, and a reminder whose channel is missing lands in a
 * generic "Miscellaneous" channel instead.
 */
export async function ensureStreakChannel(language: Language) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(STREAK_CHANNEL_ID, {
    name: translate(language, 'profile.notif.reminders'),
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Deletes channels earlier builds used. Only call it with no reminders pending: one that fires on a
 * deleted channel brings back "Miscellaneous".
 */
export async function removeLegacyChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all(LEGACY_CHANNEL_IDS.map((id) => Notifications.deleteNotificationChannelAsync(id).catch(() => {})));
}

/** Asks the OS for notification permission (if still askable). Resolves the resulting state. */
export async function requestPermission(language: Language): Promise<PermissionState> {
  await ensureStreakChannel(language);
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
