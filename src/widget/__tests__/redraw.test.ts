import { requestWidgetUpdate } from 'react-native-android-widget';

import { buildWidgetModel, widgetDrawKey } from '../model';
import { saveSnapshot, WidgetSnapshot } from '../snapshot';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-android-widget', () => ({
  ...jest.requireActual('react-native-android-widget'),
  requestWidgetUpdate: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'tr' }] }));

// Jest resolves the iOS no-op for '../refresh'; load the Android implementation by its file name.
const { refreshWidgets } = require('../refresh.ts') as typeof import('../refresh');

const HOUR = 3_600_000;
const MIN = 60_000;
const t0 = Date.parse('2026-10-30T08:00:00Z');
const snap: WidgetSnapshot = {
  language: 'tr',
  balance: 10,
  ths: 1,
  streak: 3,
  streakAtRisk: false,
  endsAt: new Date(t0 + 10 * HOUR).toISOString(),
  steps: 0,
  savedAt: t0,
};
const key = (s: WidgetSnapshot | null, now: number, extras = {}) => widgetDrawKey(buildWidgetModel(s, now, 'tr', extras));

describe('widgetDrawKey', () => {
  it('ignores what the widget does not draw: balance, streak, minutes while hours are shown', () => {
    expect(key(snap, t0 + MIN)).toBe(key({ ...snap, balance: 99, streak: 9, streakAtRisk: true }, t0 + 20 * MIN));
  });

  it('changes with everything drawn', () => {
    const base = key(snap, t0 + MIN);
    expect(key(snap, t0 + 2 * HOUR)).not.toBe(base); // 9h -> 8h
    expect(key(snap, t0 + 9.5 * HOUR)).not.toBe(key(snap, t0 + 9.6 * HOUR)); // minutes in the last hour
    expect(key({ ...snap, language: 'en' }, t0 + MIN)).not.toBe(base);
    expect(key({ ...snap, endsAt: null }, t0 + MIN)).not.toBe(base);
    expect(key(snap, t0 + MIN, { stepsToday: 10 })).not.toBe(key(snap, t0 + MIN, { stepsToday: 11 }));
    const weather = (temperatureC: number) => ({ temperatureC, symbol: 'rain', isDay: true, updatedAt: '' });
    expect(key(snap, t0 + MIN, { weather: weather(20.2) })).toBe(key(snap, t0 + MIN, { weather: weather(19.8) })); // both "20°"
    expect(key(snap, t0 + MIN, { weather: weather(20.2) })).not.toBe(key(snap, t0 + MIN, { weather: weather(21) }));
  });
});

describe('refreshWidgets', () => {
  const update = requestWidgetUpdate as jest.Mock;

  it('skips the redraw when the widget would look the same, and redraws when it changes', async () => {
    await saveSnapshot({ ...snap, savedAt: Date.now(), endsAt: new Date(Date.now() + 10 * HOUR).toISOString() });
    await refreshWidgets();
    expect(update).toHaveBeenCalledTimes(2); // both widget sizes

    await saveSnapshot({ ...snap, balance: 50, savedAt: Date.now(), endsAt: new Date(Date.now() + 10 * HOUR).toISOString() });
    await refreshWidgets();
    expect(update).toHaveBeenCalledTimes(2);

    await saveSnapshot({ ...snap, savedAt: Date.now(), endsAt: null });
    await refreshWidgets();
    expect(update).toHaveBeenCalledTimes(4);
  });
});
