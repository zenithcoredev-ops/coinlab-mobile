import { entryProgress, formatWeekCountdown, isTournamentLive, LeagueView, msUntilWeekEnd } from '../league-api';

const view: LeagueView = {
  serverTime: '2026-10-14T12:00:00Z',
  state: 'active',
  league: 2,
  speedBonus: 0.2,
  entry: { required: 100, balance: 40 },
  lastResult: null,
  tournamentResult: null,
  tournamentRewards: [],
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

describe('tournament view', () => {
  const live = {
    pending: false as const,
    stage: 'sf' as const,
    stageNumber: 2,
    stageCount: 3,
    weekEnd: '2026-10-19T12:00:00Z',
    size: 6,
    advanceCount: 4,
    yourRank: 2,
    yourPoints: 3,
    standings: [],
  };

  it('uses the stage end for the countdown while in the tournament', () => {
    const v: LeagueView = { ...view, state: 'tournament', weekEnd: undefined, tournament: live };
    expect(msUntilWeekEnd(v, 0)).toBe(5 * 24 * 3600_000);
  });

  it('only counts as live once the bracket exists', () => {
    expect(isTournamentLive({ ...view, state: 'tournament', tournament: live })).toBe(true);
    expect(isTournamentLive({ ...view, state: 'tournament', tournament: { pending: true, stage: 'qf' } })).toBe(false);
    expect(isTournamentLive(view)).toBe(false);
  });
});

describe('formatWeekCountdown', () => {
  it('splits into days, hours and minutes', () => {
    expect(formatWeekCountdown(((3 * 24 + 4) * 60 + 12) * 60_000)).toEqual({ days: 3, hours: 4, minutes: 12 });
    expect(formatWeekCountdown(-5)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});
