import type { MiningStatus } from '@/services/mining-api';

import { activeBoostCount, activeBoostsClbPerHour, adBoostClbPerHour, breakdownClbPerHour, stepBonusClbPerHour, CLB_PER_HOUR_PER_UNIT, clbPerHourOf, clbPerSecond, formatClb, formatClbPerHour, formatDecimal, formatDuration, formatRate, isStreakAtRisk, statusClbPerHour, liveBalanceAt, remainingSinceFetch, sessionProgress, streakDayIsLocal } from '../mining-math';

function status(over: Partial<MiningStatus> = {}, session: Partial<NonNullable<MiningStatus['session']>> | null = {}): MiningStatus {
  return {
    serverTime: '2026-01-01T00:00:00Z',
    balance: '10',
    streak: 0,
    streakMinedToday: false,
    currentThs: 1,
    thsBreakdown: { base: 1, friends: 0, ads: 0, league: 0, steps: 0 },
    session:
      session === null
        ? null
        : {
            id: 's',
            startedAt: '2026-01-01T00:00:00Z',
            endsAt: '2026-01-02T00:00:00Z',
            adBoosts: 0,
            remainingMs: 60_000,
            accruedClb: 0.5,
            ...session,
          },
    ...over,
  };
}

describe('liveBalanceAt', () => {
  it('is the settled balance when idle', () => {
    expect(liveBalanceAt(status({}, null), 5000)).toBe(10);
    expect(liveBalanceAt(null, 5000)).toBe(0);
  });

  it('adds server accrual plus local extrapolation at the current Th/s', () => {
    const at0 = liveBalanceAt(status(), 0);
    expect(at0).toBeCloseTo(10.5);
    const oneHour = liveBalanceAt(status({}, { remainingMs: 7_200_000 }), 3_600_000);
    expect(oneHour).toBeCloseTo(10.5 + 0.1, 6); // 2.4 CLB/day at 1 Th/s = 0.1/h
    const fast = liveBalanceAt(status({ currentThs: 2 }, { remainingMs: 7_200_000 }), 3_600_000);
    expect(fast).toBeCloseTo(10.5 + 0.2, 6);
  });

  it('stops growing once the session has ended', () => {
    const justEnded = liveBalanceAt(status(), 60_000);
    expect(liveBalanceAt(status(), 10 * 60_000)).toBeCloseTo(justEnded, 9);
  });
});

describe('remainingSinceFetch', () => {
  it('counts down and clamps at zero', () => {
    expect(remainingSinceFetch(status(), 10_000)).toBe(50_000);
    expect(remainingSinceFetch(status(), 120_000)).toBe(0);
    expect(remainingSinceFetch(status({}, null), 1)).toBe(0);
    expect(remainingSinceFetch(null, 1)).toBe(0);
  });
});

describe('sessionProgress', () => {
  it('maps remaining time to 0..1', () => {
    expect(sessionProgress(100, 100)).toBe(0);
    expect(sessionProgress(25, 100)).toBe(0.75);
    expect(sessionProgress(0, 100)).toBe(1);
    expect(sessionProgress(-5, 100)).toBe(1);
    expect(sessionProgress(5, 0)).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats hh:mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(86_399_000)).toBe('23:59:59');
    expect(formatDuration(3_661_000)).toBe('01:01:01');
  });
});

describe('isStreakAtRisk', () => {
  it('is true only for a live streak not yet extended today', () => {
    expect(isStreakAtRisk(status({ streak: 3, streakMinedToday: false }))).toBe(true);
    expect(isStreakAtRisk(status({ streak: 3, streakMinedToday: true }))).toBe(false);
    expect(isStreakAtRisk(status({ streak: 0, streakMinedToday: false }))).toBe(false);
    expect(isStreakAtRisk(null)).toBe(false);
  });
});

describe('streakDayIsLocal', () => {
  it('is true only when the server sends streakExpiresAt, even as null', () => {
    expect(streakDayIsLocal(null)).toBe(false);
    expect(streakDayIsLocal(status())).toBe(false);
    expect(streakDayIsLocal(status({ streakExpiresAt: null }))).toBe(true);
    expect(streakDayIsLocal(status({ streakExpiresAt: '2026-03-10T21:00:00Z' }))).toBe(true);
  });
});

describe('formatRate', () => {
  it('shows the server speed as CLB per hour at the rate the balance actually grows', () => {
    // 1 unit of server speed collects 2.4 CLB a day, so 0.10 CLB an hour.
    expect(CLB_PER_HOUR_PER_UNIT).toBeCloseTo(0.1, 12);
    expect(clbPerSecond(1) * 3600).toBeCloseTo(CLB_PER_HOUR_PER_UNIT, 12);
    expect(formatRate(1, 'en')).toBe('0.10');
    expect(formatRate(2.35, 'en')).toBe('0.235');
    expect(formatRate(0.2, 'en')).toBe('0.02');
    expect(formatRate(0.05, 'en')).toBe('0.005');
    expect(formatRate(12.5, 'en')).toBe('1.25');
    expect(formatRate(0, 'en')).toBe('0.00');
  });
});

describe('numbers in the app language', () => {
  it('uses a decimal comma in Turkish and a point in English', () => {
    expect(formatClb(16.291714, 'tr')).toBe('16,29171');
    expect(formatClb(16.291714, 'en')).toBe('16.29171');
    expect(formatRate(1, 'tr')).toBe('0,10');
    expect(formatRate(0.05, 'tr')).toBe('0,005');
    expect(formatDecimal(12.345, 2, 'tr')).toBe('12,35');
    expect(formatDecimal(-3.5, 1, 'tr')).toBe('-3,5');
    expect(formatDecimal(1234.5, 3, 'en')).toBe('1234.500');
  });
});

describe('CLB/h from the server', () => {
  it('uses the server’s CLB/h fields when it sends them, else converts Th/s at 0.10 CLB/h each', () => {
    expect(clbPerHourOf(0.137, 1)).toBe(0.137);
    expect(clbPerHourOf(0, 1)).toBe(0);
    expect(clbPerHourOf(undefined, 1.5)).toBeCloseTo(0.15, 12);
    expect(clbPerHourOf(null, 1.5)).toBeCloseTo(0.15, 12);

    expect(statusClbPerHour(status({ clbPerHour: 0.137 }))).toBe(0.137);
    expect(statusClbPerHour(status({ currentThs: 2 }))).toBeCloseTo(0.2, 12);
    expect(statusClbPerHour(null)).toBe(0);

    const breakdown = { base: 0.1, friends: 0.04, ads: 0, league: 0.03, steps: 0.007 };
    expect(breakdownClbPerHour(status({ clbPerHourBreakdown: breakdown }), 'steps')).toBe(0.007);
    expect(breakdownClbPerHour(status({ thsBreakdown: { base: 1, friends: 0, ads: 0, league: 0, steps: 0.05 } }), 'steps')).toBeCloseTo(0.005, 12);
    expect(formatClbPerHour(0.137, 'tr')).toBe('0,137');
  });

  it('animates the balance at the server’s CLB/h when it sends one', () => {
    const at = (over: Partial<MiningStatus>) => liveBalanceAt(status(over, { remainingMs: 7_200_000 }), 3_600_000);
    expect(at({ currentThs: 1, clbPerHour: 0.25 })).toBeCloseTo(10.5 + 0.25, 6);
    expect(at({ currentThs: 1 })).toBeCloseTo(10.5 + 0.1, 6);
  });
});

describe('rewarded boosts in CLB/h', () => {
  const boost = (over = {}) => ({ startsAt: 'a', endsAt: 'b', boostThs: 0.5, ...over });

  it('counts running boosts from a list (current servers) or a count (older ones)', () => {
    expect(activeBoostCount({ activeBoosts: [boost(), boost()] })).toBe(2);
    expect(activeBoostCount({ activeBoosts: 3 })).toBe(3);
  });

  it('takes the per-view bonus from the server, else converts boostThs, else does not know', () => {
    expect(adBoostClbPerHour({ clbPerHourBonus: 0.05, boostThs: 0.5 })).toBe(0.05);
    expect(adBoostClbPerHour({ boostThs: 0.5 })).toBeCloseTo(0.05, 12);
    expect(adBoostClbPerHour({})).toBeNull();
  });

  it('adds up the running boosts: the server total, else each boost, else unknown for a bare count', () => {
    expect(activeBoostsClbPerHour({ activeBoosts: [boost()], activeClbPerHourBonus: 0.07 })).toBe(0.07);
    expect(activeBoostsClbPerHour({ activeBoosts: [boost({ clbPerHourBonus: 0.06 }), boost()] })).toBeCloseTo(0.11, 12);
    expect(activeBoostsClbPerHour({ activeBoosts: 2 })).toBeNull();
  });
});

describe('stepBonusClbPerHour', () => {
  const running = status({ clbPerHourBreakdown: { base: 0.1, friends: 0, ads: 0, league: 0, steps: 0.01 } }, { startedAt: 'S1' });

  it('uses the latest sync when it is newer than the status and for the same session', () => {
    expect(stepBonusClbPerHour(running, 1000, { session: 'S1', at: 2000, bonusClbPerHour: 0.03 })).toBe(0.03);
  });

  it('otherwise the status breakdown', () => {
    expect(stepBonusClbPerHour(running, 3000, { session: 'S1', at: 2000, bonusClbPerHour: 0.03 })).toBe(0.01);
    expect(stepBonusClbPerHour(running, 1000, { session: 'S0', at: 2000, bonusClbPerHour: 0.03 })).toBe(0.01);
    expect(stepBonusClbPerHour(running, 1000, null)).toBe(0.01);
    expect(stepBonusClbPerHour(null, 0, null)).toBe(0);
  });
});
