import type { MiningStatus } from '@/services/mining-api';

import { liveCollectedTodayAt, startOfLocalDay } from '../mining-math';

const HOUR = 3_600_000;
// Device-local times, so the tests hold in any time zone.
const local = (h: number, m = 0) => new Date(2026, 2, 11, h, m).getTime();
// The device clock runs 2 minutes ahead of the server's.
const SKEW = 2 * 60_000;
const iso = (deviceMs: number) => new Date(deviceMs - SKEW).toISOString();

function status(over: Partial<MiningStatus> = {}, remainingMs: number | null = 10 * HOUR): MiningStatus {
  return {
    serverTime: iso(local(22)),
    balance: '10',
    streak: 1,
    streakMinedToday: true,
    currentThs: 1,
    clbPerHour: 0.36, // 0.0001 Wago/s
    thsBreakdown: { base: 1, friends: 0, ads: 0, league: 0, steps: 0 },
    session:
      remainingMs === null
        ? null
        : { id: 's', startedAt: '', endsAt: '', adBoosts: 0, remainingMs, accruedClb: 0 },
    collectedToday: 1.84,
    collectedTodayAsOf: iso(local(22)),
    ...over,
  };
}

const fetchedAt = local(22);

describe('liveCollectedTodayAt', () => {
  it('ticks on at the session’s speed from the server’s figure', () => {
    expect(liveCollectedTodayAt(status(), fetchedAt, fetchedAt)).toBeCloseTo(1.84);
    expect(liveCollectedTodayAt(status(), fetchedAt, fetchedAt + 10_000)).toBeCloseTo(1.841);
    expect(liveCollectedTodayAt(status(), fetchedAt, fetchedAt + HOUR)).toBeCloseTo(2.2);
  });

  it('lines up the server and device clocks: counts the server-side gap, not the device skew', () => {
    // Counted 60 s (server time) before the status was sent; the device being 2 min ahead doesn't matter.
    const s = status({ collectedTodayAsOf: new Date(Date.parse(iso(local(22))) - 60_000).toISOString() });
    expect(liveCollectedTodayAt(s, fetchedAt, fetchedAt)).toBeCloseTo(1.84 + 0.006);
    expect(liveCollectedTodayAt(s, fetchedAt, fetchedAt + 10_000)).toBeCloseTo(1.84 + 0.007);
  });

  it('stops growing when the session ends, and stays put without one', () => {
    expect(liveCollectedTodayAt(status({}, 30 * 60_000), fetchedAt, fetchedAt + HOUR)).toBeCloseTo(1.84 + 0.18);
    expect(liveCollectedTodayAt(status({}, null), fetchedAt, fetchedAt)).toBeCloseTo(1.84);
    expect(liveCollectedTodayAt(status({}, null), fetchedAt, fetchedAt + HOUR)).toBeCloseTo(1.84);
  });

  it('starts again from zero at local midnight', () => {
    const midnight = startOfLocalDay(local(22)) + 24 * HOUR;
    // 22:00 + 2 h = midnight: only what came after midnight counts.
    expect(liveCollectedTodayAt(status(), fetchedAt, midnight - 1000)).toBeCloseTo(1.84 + 0.72 - 0.0001);
    expect(liveCollectedTodayAt(status(), fetchedAt, midnight)).toBeCloseTo(0);
    expect(liveCollectedTodayAt(status(), fetchedAt, midnight + 30 * 60_000)).toBeCloseTo(0.18);
    // Without a session the new day is 0, not yesterday's figure.
    expect(liveCollectedTodayAt(status({}, null), fetchedAt, midnight + HOUR)).toBe(0);
    // A session that ended before midnight adds nothing to the new day.
    expect(liveCollectedTodayAt(status({}, HOUR), fetchedAt, midnight + HOUR)).toBe(0);
  });

  it('is null without the server’s figure (older servers), so the strip stays hidden', () => {
    expect(liveCollectedTodayAt(status({ collectedToday: undefined, collectedTodayAsOf: undefined }), fetchedAt, fetchedAt)).toBeNull();
    expect(liveCollectedTodayAt(null, fetchedAt, fetchedAt)).toBeNull();
  });

  it('falls back to the status time when the server sends no "as of"', () => {
    expect(liveCollectedTodayAt(status({ collectedTodayAsOf: undefined }), fetchedAt, fetchedAt + HOUR)).toBeCloseTo(2.2);
  });
});
