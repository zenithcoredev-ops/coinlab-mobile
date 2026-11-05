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
  describe('session steps', () => {
    const running: WidgetSnapshot = { ...snap, steps: 1240, sessionStartedAt: 'S1', stepBonusClbPerHour: 0.005 };

    it('takes the server’s count from the snapshot, with its step bonus', () => {
      const m = buildWidgetModel(running, t0 + HOUR);
      expect([m.sessionSteps, m.sessionStepBonus]).toEqual([1240, 0.005]);
    });

    it('takes a newer background Health Connect read of the same session', () => {
      const read = (session: string, at: number) => ({ sessionSteps: { session, steps: 2100, readAt: at } });
      expect(buildWidgetModel(running, t0 + HOUR, 'tr', read('S1', t0 + 30 * 60_000)).sessionSteps).toBe(2100);
      expect(buildWidgetModel(running, t0 + HOUR, 'tr', read('S1', t0 - 1)).sessionSteps).toBe(1240); // older than the snapshot
      expect(buildWidgetModel(running, t0 + HOUR, 'tr', read('S0', t0 + 30 * 60_000)).sessionSteps).toBe(1240); // another session
    });

    it('is null without a running session', () => {
      expect(buildWidgetModel({ ...running, endsAt: null }, t0).sessionSteps).toBeNull();
      expect(buildWidgetModel(running, t0 + 11 * HOUR).sessionSteps).toBeNull(); // finished
      expect(buildWidgetModel(null, t0).sessionSteps).toBeNull();
    });
  });

  it('grows the balance at the saved CLB/h, or at 0.10 CLB/h per Th/s for older snapshots', () => {
    expect(buildWidgetModel({ ...snap, clbPerHour: 0.3 }, t0 + 2 * HOUR).balance).toBeCloseTo(10 + 0.6, 6);
    expect(buildWidgetModel(snap, t0 + 2 * HOUR).balance).toBeCloseTo(10 + 0.2, 6);
  });

  it('draws a start-mining state without a snapshot', () => {
    expect(buildWidgetModel(null, t0).state).toBe('idle');
    expect(buildWidgetModel(null, t0, 'tr').language).toBe('tr');
  });

  it('tells signed out apart from nothing saved yet', () => {
    const out = buildWidgetModel({ signedOut: true, language: 'tr' }, t0);
    expect(out.state).toBe('signedOut');
    expect(out.language).toBe('tr');
    expect(buildWidgetModel({ signedOut: true }, t0, 'en').language).toBe('en');
    expect(buildWidgetModel(null, t0).state).toBe('idle');
  });

  it('counts down and keeps accruing balance while active', () => {
    const m = buildWidgetModel(snap, t0 + 2 * HOUR);
    expect(m.state).toBe('active');
    expect(m.remainingMs).toBe(8 * HOUR);
    expect(m.balance).toBeCloseTo(10 + (2 * 2.4) / 24, 6);
    expect(m.language).toBe('tr');
    expect(m.stepsToday).toBeNull();
  });

  it('carries today\'s Health Connect steps, also without a snapshot, but not when signed out', () => {
    expect(buildWidgetModel(snap, t0, 'tr', { stepsToday: 6240 }).stepsToday).toBe(6240);
    expect(buildWidgetModel(null, t0, 'tr', { stepsToday: 0 }).stepsToday).toBe(0);
    expect(buildWidgetModel({ signedOut: true }, t0, 'tr', { stepsToday: 6240 }).stepsToday).toBeNull();
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
    expect(s).toMatchObject({ sessionStartedAt: '2026-10-19T07:00:00Z', stepBonusClbPerHour: 0 });
    const withBonus = buildSnapshot({ ...status, clbPerHourBreakdown: { base: 0.1, friends: 0, ads: 0, league: 0, steps: 0.005 } }, 'en', 1);
    expect(withBonus.stepBonusClbPerHour).toBe(0.005);
  });

  it('saves the speed in CLB/h: the server’s when sent, else converted from Th/s', () => {
    expect(buildSnapshot({ ...status, clbPerHour: 0.42 }, 'en', 1).clbPerHour).toBe(0.42);
    expect(buildSnapshot(status, 'en', 1).clbPerHour).toBeCloseTo(0.15, 12);
  });

  it('drops session data when idle', () => {
    const s = buildSnapshot({ ...status, session: null }, 'en', 1);
    expect(s.endsAt).toBeNull();
    expect(s.steps).toBe(0);
  });
});
