import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { translate } from '@/i18n/translate';
import type { Language } from '@/i18n/translate';

const ENABLED_KEY = 'coinlab_notifications_enabled';
export const STREAK_CHANNEL_ID = 'streak-reminders';
// Earlier builds posted reminders here. Android won't raise an existing channel's importance, so
// reminders moved to a new channel and this one is removed.
const LEGACY_CHANNEL_ID = 'default';

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
 * the permission prompt once a channel exists, and a reminder posted to a missing channel isn't shown.
 */
export async function ensureStreakChannel(language: Language) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(STREAK_CHANNEL_ID, {
    name: translate(language, 'profile.notif.reminders'),
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL_ID).catch(() => {});
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
