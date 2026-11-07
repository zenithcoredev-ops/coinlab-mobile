import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { CHANNEL_IDS, ensureChannels, requestPermission, STREAK_CHANNEL_ID } from '../notifications';
import { syncNotifications } from '../notification-scheduler';

const streakOnly = (streak: number) => ({ streak: { streak, minedToday: true }, session: null });

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

describe('notification channels', () => {
  let restoreOS: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    restoreOS = () => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
  });

  afterEach(() => restoreOS());

  it('are four high-importance, vibrating channels named in the app language; the streak one keeps its id', async () => {
    await ensureChannels('tr');
    expect(STREAK_CHANNEL_ID).toBe('streak-reminders-v2');
    expect(CHANNEL_IDS).toEqual({ streak: 'streak-reminders-v2', collect: 'collect-v1', league: 'league-v1', reminders: 'reminders-v1' });
    const settings = { importance: Notifications.AndroidImportance.HIGH, enableVibrate: true, vibrationPattern: [0, 250, 250, 250] };
    expect(mocked.setNotificationChannelAsync.mock.calls).toEqual([
      ['streak-reminders-v2', { name: 'Seri', ...settings }],
      ['collect-v1', { name: 'Toplama', ...settings }],
      ['league-v1', { name: 'Lig', ...settings }],
      ['reminders-v1', { name: 'Hatırlatmalar', ...settings }],
    ]);

    jest.clearAllMocks();
    await ensureChannels('en');
    expect(mocked.setNotificationChannelAsync.mock.calls.map(([, c]) => c.name)).toEqual(['Streak', 'Collecting', 'League', 'Reminders']);
  });

  it('removes the earlier channels and "Miscellaneous", only after pending reminders are cancelled', async () => {
    await syncNotifications(streakOnly(3), { enabled: true, language: 'en', now: new Date(2026, 2, 10, 8) });
    const deleted = mocked.deleteNotificationChannelAsync.mock.calls.map(([id]) => id).sort();
    expect(deleted).toEqual(['default', 'expo_notifications_fallback_notification_channel', 'streak-reminders']);
    const lastCancel = Math.max(...mocked.cancelScheduledNotificationAsync.mock.invocationCallOrder);
    expect(Math.min(...mocked.deleteNotificationChannelAsync.mock.invocationCallOrder)).toBeGreaterThan(lastCancel);
    expect(Math.max(...mocked.deleteNotificationChannelAsync.mock.invocationCallOrder)).toBeLessThan(
      mocked.scheduleNotificationAsync.mock.invocationCallOrder[0]
    );

    // Also with reminders off: nothing is pending, so it's safe.
    jest.clearAllMocks();
    await syncNotifications(streakOnly(0), { enabled: false, language: 'en' });
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
    await syncNotifications(streakOnly(3), { enabled: true, language: 'tr', now: new Date(2026, 2, 10, 8) });
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: expect.objectContaining({ channelId: STREAK_CHANNEL_ID }) })
    );
    expect(mocked.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.scheduleNotificationAsync.mock.invocationCallOrder[0]
    );
  });

  it('is left alone on platforms without channels', async () => {
    restoreOS();
    await ensureChannels('en');
    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
