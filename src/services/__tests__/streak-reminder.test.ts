import * as Notifications from 'expo-notifications';

import { deviceClock } from '@/lib/streak-reminder';
import { STREAK_CHANNEL_ID } from '../notifications';
import { cancelStreakReminder, syncStreakReminder } from '../streak-reminder';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  deleteNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const ALL_IDS = ['streak-reminder', 'streak-not-started-0', 'streak-not-started-1', 'streak-not-started-2'];
const now = new Date(2026, 2, 10, 8);

const scheduled = () =>
  mocked.scheduleNotificationAsync.mock.calls.map(([request]) => ({
    id: request.identifier,
    body: request.content.body,
    date: (request.trigger as Notifications.DateTriggerInput).date,
    channelId: (request.trigger as Notifications.DateTriggerInput).channelId,
  }));

beforeEach(() => jest.clearAllMocks());

describe('syncStreakReminder', () => {
  it('schedules the streak reminder with the hours left', async () => {
    const expires = deviceClock(now, 1, 0).toISOString();
    await syncStreakReminder({ streak: 6, minedToday: false, streakExpiresAt: expires, session: null }, true, 'tr', now);
    expect(scheduled()).toEqual([
      {
        id: 'streak-reminder',
        body: '6 günlük serin 4 saat sonra bitiyor, korumak için kazımı başlat!',
        date: deviceClock(now, 0, 20),
        channelId: STREAK_CHANNEL_ID,
      },
    ]);
  });

  it('schedules three "not started" reminders when there is no streak', async () => {
    await syncStreakReminder({ streak: 0, minedToday: false, streakExpiresAt: null, session: null }, true, 'en', now);
    expect(scheduled()).toEqual(
      [0, 1, 2].map((i) => ({
        id: `streak-not-started-${i}`,
        body: 'You haven’t started mining today',
        date: deviceClock(now, i, 20),
        channelId: STREAK_CHANNEL_ID,
      }))
    );
  });

  it('cancels every reminder first, and schedules nothing when reminders are off', async () => {
    await syncStreakReminder({ streak: 0, minedToday: false, streakExpiresAt: null, session: null }, false, 'en', now);
    expect(mocked.cancelScheduledNotificationAsync.mock.calls.map(([id]) => id).sort()).toEqual([...ALL_IDS].sort());
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('runs syncs and cancels one at a time, so the last one wins', async () => {
    const order: string[] = [];
    mocked.cancelScheduledNotificationAsync.mockImplementation(async (id) => {
      if (id === 'streak-reminder') order.push('cancel');
    });
    mocked.scheduleNotificationAsync.mockImplementation(async (request) => {
      await Promise.resolve();
      order.push(request.identifier!);
      return 'id';
    });

    const noStreak = { streak: 0, minedToday: false, streakExpiresAt: null, session: null };
    const streak = { streak: 2, minedToday: false, streakExpiresAt: deviceClock(now, 1, 0).toISOString(), session: null };
    await Promise.all([
      syncStreakReminder(noStreak, true, 'en', now),
      syncStreakReminder(streak, true, 'en', now),
      cancelStreakReminder(),
    ]);
    expect(order).toEqual([
      'cancel',
      'streak-not-started-0',
      'streak-not-started-1',
      'streak-not-started-2',
      'cancel',
      'streak-reminder',
      'cancel',
    ]);
  });
});
