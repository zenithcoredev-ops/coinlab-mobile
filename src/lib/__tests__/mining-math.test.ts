import type { MiningStatus } from '@/services/mining-api';

import { formatDuration, liveBalanceAt, remainingSinceFetch, sessionProgress } from '../mining-math';

function status(over: Partial<MiningStatus> = {}, session: Partial<NonNullable<MiningStatus['session']>> | null = {}): MiningStatus {
  return {
    serverTime: '2026-01-01T00:00:00Z',
    balance: '10',
    streak: 0,
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
