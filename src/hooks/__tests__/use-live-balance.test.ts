import { act, renderHook } from '@testing-library/react-native';

import { liveBalanceAt } from '@/lib/mining-math';
import type { MiningStatus } from '@/services/mining-api';
import { useLiveBalance } from '../use-live-balance';

let mockMining: { status: MiningStatus | null; fetchedAt: number } = { status: null, fetchedAt: 0 };
jest.mock('@/context/mining', () => ({ useMining: () => mockMining }));

const mining: MiningStatus = {
  serverTime: '2026-03-10T12:00:00Z',
  balance: '10',
  streak: 1,
  streakMinedToday: true,
  currentThs: 2,
  thsBreakdown: { base: 1, friends: 1, ads: 0, league: 0, steps: 0 },
  session: { id: 's', startedAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-11T00:00:00Z', adBoosts: 0, remainingMs: 12 * 3_600_000, accruedClb: 1.5 },
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useLiveBalance', () => {
  it('is null before the first mining status', () => {
    mockMining = { status: null, fetchedAt: 0 };
    expect(renderHook(() => useLiveBalance()).result.current).toBeNull();
  });

  it('matches the Mine screen: settled + accrued, ticking every second', () => {
    mockMining = { status: mining, fetchedAt: Date.now() };
    const { result } = renderHook(() => useLiveBalance());
    expect(result.current).toBe(liveBalanceAt(mining, 0));
    expect(result.current).toBeCloseTo(11.5);

    act(() => jest.advanceTimersByTime(10_000));
    expect(result.current).toBeCloseTo(liveBalanceAt(mining, 10_000));
    expect(result.current!).toBeGreaterThan(11.5);
  });
});
