jest.mock('@react-native-async-storage/async-storage', () => ({}));

import { buildWidgetModel, splitRemaining } from '../model';
import { buildSnapshot, WidgetSnapshot } from '../snapshot';
import type { MiningStatus } from '@/services/mining-api';

const HOUR = 3_600_000;
const t0 = Date.parse('2026-10-19T08:00:00Z');
const snap: WidgetSnapshot = {
  language: 'tr',
  balance: 10,
  ths: 1,
  streak: 4,
  streakAtRisk: false,
  endsAt: new Date(t0 + 10 * HOUR).toISOString(),
  steps: 3200,
  savedAt: t0,
};

describe('buildWidgetModel', () => {
  it('draws a start-mining state without a snapshot', () => {
    expect(buildWidgetModel(null, t0).state).toBe('idle');
    expect(buildWidgetModel(null, t0, 'tr').language).toBe('tr');
  });

  it('counts down and keeps accruing balance while active', () => {
    const m = buildWidgetModel(snap, t0 + 2 * HOUR);
    expect(m.state).toBe('active');
    expect(m.remainingMs).toBe(8 * HOUR);
    expect(m.balance).toBeCloseTo(10 + (2 * 2.4) / 24, 6);
    expect(m.language).toBe('tr');
    expect(m.steps).toBe(3200);
  });

  it('stops accruing at the session end and reports finished', () => {
    const m = buildWidgetModel(snap, t0 + 30 * HOUR);
    expect(m.state).toBe('finished');
    expect(m.remainingMs).toBe(0);
    expect(m.balance).toBeCloseTo(10 + (10 * 2.4) / 24, 6);
  });

  it('is idle when no session was running', () => {
    const m = buildWidgetModel({ ...snap, endsAt: null, steps: 0 }, t0 + HOUR);
    expect(m.state).toBe('idle');
    expect(m.balance).toBe(10);
  });
});

describe('splitRemaining', () => {
  it('rounds partial minutes up so the widget never shows 0m while time remains', () => {
    expect(splitRemaining(5 * HOUR + 12 * 60_000)).toEqual({ hours: 5, minutes: 12 });
    expect(splitRemaining(30_000)).toEqual({ hours: 0, minutes: 1 });
    expect(splitRemaining(0)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('buildSnapshot', () => {
  const status = {
    serverTime: '2026-10-19T08:00:00Z',
    balance: '5.0000',
    todaySteps: 1500,
    streak: 3,
    streakMinedToday: false,
    currentThs: 1.5,
    thsBreakdown: { base: 1, friends: 0, ads: 0, league: 0, steps: 0 },
    session: { id: 's', startedAt: '2026-10-19T07:00:00Z', endsAt: '2026-10-20T07:00:00Z', adBoosts: 0, remainingMs: 1, accruedClb: 0.5 },
  } as MiningStatus;

  it('captures the running session', () => {
    const s = buildSnapshot(status, 'en', 123);
    expect(s).toMatchObject({ balance: 5.5, ths: 1.5, streak: 3, streakAtRisk: true, steps: 1500, savedAt: 123 });
    expect(s.endsAt).toBe('2026-10-20T07:00:00Z');
  });

  it('drops session data when idle', () => {
    const s = buildSnapshot({ ...status, session: null }, 'en', 1);
    expect(s.endsAt).toBeNull();
    expect(s.steps).toBe(0);
  });
});
