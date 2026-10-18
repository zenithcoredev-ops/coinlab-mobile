import { entryProgress, formatWeekCountdown, LeagueView, msUntilWeekEnd } from '../league-api';

const view: LeagueView = {
  serverTime: '2026-10-14T12:00:00Z',
  state: 'active',
  league: 2,
  speedBonus: 0.2,
  entry: { required: 100, balance: 40 },
  lastResult: null,
  weekEnd: '2026-10-19T00:00:00Z',
};

describe('entryProgress', () => {
  it('is the share of the entry requirement already earned', () => {
    expect(entryProgress({ required: 100, balance: 40 })).toBe(0.4);
  });

  it('is capped at 1 and never negative', () => {
    expect(entryProgress({ required: 100, balance: 250 })).toBe(1);
    expect(entryProgress({ required: 100, balance: -5 })).toBe(0);
  });
});

describe('msUntilWeekEnd', () => {
  it('counts down from the server snapshot, not the device clock', () => {
    expect(msUntilWeekEnd(view, 0)).toBe(4.5 * 24 * 3600_000);
    expect(msUntilWeekEnd(view, 3600_000)).toBe(msUntilWeekEnd(view, 0) - 3600_000);
  });

  it('is zero without a week or after it ended', () => {
    expect(msUntilWeekEnd({ ...view, weekEnd: undefined }, 0)).toBe(0);
    expect(msUntilWeekEnd(view, 99 * 24 * 3600_000)).toBe(0);
  });
});

describe('formatWeekCountdown', () => {
  it('splits into days, hours and minutes', () => {
    expect(formatWeekCountdown(((3 * 24 + 4) * 60 + 12) * 60_000)).toEqual({ days: 3, hours: 4, minutes: 12 });
    expect(formatWeekCountdown(-5)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});
