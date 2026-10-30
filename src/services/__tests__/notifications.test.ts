import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureStreakChannel, requestPermission, STREAK_CHANNEL_ID } from '../notifications';
import { syncStreakReminder } from '../streak-reminder';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5, HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  deleteNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: jest.fn(),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;

describe('streak reminder channel', () => {
  let restoreOS: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    restoreOS = () => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
  });

  afterEach(() => restoreOS());

  it('is a new high-importance, vibrating channel named in the app language', async () => {
    await ensureStreakChannel('tr');
    expect(STREAK_CHANNEL_ID).toBe('streak-reminders-v2');
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(STREAK_CHANNEL_ID, {
      name: 'Seri hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
    });

    await ensureStreakChannel('en');
    expect(mocked.setNotificationChannelAsync).toHaveBeenLastCalledWith(
      STREAK_CHANNEL_ID,
      expect.objectContaining({ name: 'Streak reminders' })
    );
  });

  it('removes the earlier channels and "Miscellaneous", only after pending reminders are cancelled', async () => {
    await syncStreakReminder({ streak: 3, minedToday: true }, true, 'en', new Date(2026, 2, 10, 8));
    const deleted = mocked.deleteNotificationChannelAsync.mock.calls.map(([id]) => id).sort();
    expect(deleted).toEqual(['default', 'expo_notifications_fallback_notification_channel', 'streak-reminders']);
    const lastCancel = Math.max(...mocked.cancelScheduledNotificationAsync.mock.invocationCallOrder);
    expect(Math.min(...mocked.deleteNotificationChannelAsync.mock.invocationCallOrder)).toBeGreaterThan(lastCancel);
    expect(Math.max(...mocked.deleteNotificationChannelAsync.mock.invocationCallOrder)).toBeLessThan(
      mocked.scheduleNotificationAsync.mock.invocationCallOrder[0]
    );

    // Also with reminders off: nothing is pending, so it's safe.
    jest.clearAllMocks();
    await syncStreakReminder(null, false, 'en');
    expect(mocked.deleteNotificationChannelAsync).toHaveBeenCalledTimes(3);
  });

  it('never removes channels when asking for permission', async () => {
    await requestPermission('en');
    expect(mocked.deleteNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('exists before the permission prompt', async () => {
    await requestPermission('en');
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(STREAK_CHANNEL_ID, expect.anything());
    expect(mocked.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.getPermissionsAsync.mock.invocationCallOrder[0]
    );
  });

  it('is created before the reminder is scheduled on it', async () => {
    await syncStreakReminder({ streak: 3, minedToday: true }, true, 'tr', new Date(2026, 2, 10, 8));
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: expect.objectContaining({ channelId: STREAK_CHANNEL_ID }) })
    );
    expect(mocked.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.scheduleNotificationAsync.mock.invocationCallOrder[0]
    );
  });

  it('is left alone on platforms without channels', async () => {
    restoreOS();
    await ensureStreakChannel('en');
    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
