import * as Notifications from 'expo-notifications';

import { translate } from '@/i18n/translate';
import { ALL_NOTIFICATION_IDS } from '@/lib/notification-plan';
import { deviceClock } from '@/lib/streak-reminder';
import { loadNotificationLog } from '../notification-log';
import { CHANNEL_IDS } from '../notifications';
import { cancelNotifications, syncNotifications } from '../notification-scheduler';

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

const AsyncStorage = require('@react-native-async-storage/async-storage');
const mocked = Notifications as jest.Mocked<typeof Notifications>;
const LEGACY_IDS = ['streak-reminder', 'streak-not-started-0', 'streak-not-started-1', 'streak-not-started-2'];
const now = new Date(2026, 2, 10, 8);
const HOUR = 3_600_000;

const scheduled = () =>
  mocked.scheduleNotificationAsync.mock.calls.map(([request]) => ({
    id: request.identifier,
    body: request.content.body as string,
    route: (request.content.data as { route: string }).route,
    date: (request.trigger as Notifications.DateTriggerInput).date as Date,
    channelId: (request.trigger as Notifications.DateTriggerInput).channelId,
  }));
const options = (language: 'tr' | 'en' = 'tr') => ({ enabled: true, language, now });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('syncNotifications', () => {
  it('schedules the streak reminder on the streak channel with the streak the user will have', async () => {
    // Today mined with 8 days; tomorrow is covered, the day after is at risk.
    const expires = deviceClock(now, 3, 0).toISOString();
    await syncNotifications({ streak: { streak: 8, minedToday: true, streakExpiresAt: expires, session: null }, session: null }, options());
    const streak = scheduled().find((n) => n.id === 'notif-streak-0')!;
    expect(streak).toMatchObject({ date: deviceClock(now, 2, 20), channelId: CHANNEL_IDS.streak, route: '/(tabs)' });
    expect(streak.body).toMatch(/9 günlük seri/);
    expect(streak.body).toMatch(/4 saat/);
  });

  it('schedules the session end on the collecting channel and the come-back reminders on the reminders channel', async () => {
    const session = { startedAt: new Date(now.getTime() - 10 * HOUR).toISOString(), endsAt: new Date(now.getTime() + 6 * HOUR).toISOString() };
    await syncNotifications({ streak: null, session }, options('en'));
    const all = scheduled();
    expect(all.find((n) => n.id === 'notif-sessionEnd-0')).toMatchObject({
      date: new Date(session.endsAt),
      channelId: CHANNEL_IDS.collect,
      route: '/(tabs)',
    });
    const comeback = all.filter((n) => n.id?.startsWith('notif-comeback-'));
    expect(comeback.map((n) => n.date)).toEqual([deviceClock(now, 2, 19), deviceClock(now, 4, 19), deviceClock(now, 7, 19)]);
    expect(new Set(comeback.map((n) => n.channelId))).toEqual(new Set([CHANNEL_IDS.reminders]));
    for (const n of all) expect(n.body).not.toMatch(/\{\w+\}/); // every placeholder filled
  });

  it('writes the planned text in the app language', async () => {
    await syncNotifications({ streak: null, session: null }, options('en'));
    const bodies = scheduled().map((n) => n.body);
    const variants = [1, 2, 3].map((i) => translate('en', `notif.comeback.${i}` as never));
    for (const body of bodies) expect(variants).toContain(body);
  });

  it('the step and league reminders: their channels, screens and step count in the app’s style', async () => {
    const session = { startedAt: new Date(now.getTime() - HOUR).toISOString(), endsAt: new Date(now.getTime() + 20 * HOUR).toISOString() };
    await syncNotifications(
      { streak: null, session, steps: { sessionSteps: 8_600, perLevel: 1000, cap: 10_000 }, league: { weekEndsAt: deviceClock(now, 2, 23) } },
      options()
    );
    const steps = scheduled().find((n) => n.id === 'notif-steps-0')!;
    expect(steps).toMatchObject({ channelId: CHANNEL_IDS.collect, route: '/(tabs)/tasks', date: deviceClock(now, 0, 19) });
    expect(steps.body).toMatch(/400/);
    const league = scheduled().find((n) => n.id === 'notif-league-0')!;
    expect(league).toMatchObject({ channelId: CHANNEL_IDS.league, route: '/(tabs)/league', date: deviceClock(now, 2, 20) });
  });

  it('cancels every id first (old streak ones too), and schedules nothing when notifications are off', async () => {
    await syncNotifications({ streak: null, session: null }, { ...options(), enabled: false });
    expect(mocked.cancelScheduledNotificationAsync.mock.calls.map(([id]) => id).sort()).toEqual([...ALL_NOTIFICATION_IDS, ...LEGACY_IDS].sort());
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('logs what it scheduled, so a later plan the same day counts what was already shown', async () => {
    await syncNotifications({ streak: null, session: null }, options());
    expect((await loadNotificationLog()).map((e) => e.type)).toEqual(['comeback', 'comeback', 'comeback']);
  });

  it('runs syncs and cancels one at a time, so the last one wins', async () => {
    const order: string[] = [];
    mocked.cancelScheduledNotificationAsync.mockImplementation(async (id) => {
      if (id === 'notif-sessionEnd-0') order.push('cancel');
    });
    mocked.scheduleNotificationAsync.mockImplementation(async (request) => {
      await Promise.resolve();
      order.push(request.identifier!);
      return 'id';
    });
    const session = { startedAt: now.toISOString(), endsAt: new Date(now.getTime() + 2 * HOUR).toISOString() };
    await Promise.all([
      syncNotifications({ streak: null, session: null }, options()),
      syncNotifications({ streak: null, session }, options()),
      cancelNotifications(),
    ]);
    expect(order).toEqual([
      'cancel',
      'notif-comeback-0',
      'notif-comeback-1',
      'notif-comeback-2',
      'cancel',
      'notif-sessionEnd-0',
      'notif-comeback-0',
      'notif-comeback-1',
      'notif-comeback-2',
      'cancel',
    ]);
  });
});
