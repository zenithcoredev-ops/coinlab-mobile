import { renderHook, waitFor } from '@testing-library/react-native';

import { syncNotifications } from '@/services/notification-scheduler';
import { useNotificationPlanner } from '../use-notification-planner';

jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok' } }) }));
jest.mock('@/context/notifications', () => ({ useNotifications: () => ({ active: true, typePrefs: require('@/lib/notification-plan').ALL_TYPES_ON }) }));
jest.mock('@/i18n', () => ({ useI18n: () => ({ language: 'tr' }) }));
jest.mock('@/context/steps', () => ({ useSteps: () => ({ availability: 'denied', steps: 0 }) }));
jest.mock('@/context/ads', () => ({ useAds: () => ({ rewardedOffered: true }) }));
let mockAds: Record<string, unknown> | undefined;
jest.mock('@/context/mining', () => ({
  useMining: () => ({
    status: {
      streak: 3,
      streakMinedToday: true,
      session: { startedAt: new Date(Date.now() - 3_600_000).toISOString(), endsAt: new Date(Date.now() + 20 * 3_600_000).toISOString() },
      ads: mockAds,
    },
  }),
}));
jest.mock('@/services/league-cache', () => ({
  LEAGUE_CACHE_MAX_AGE_MS: 86_400_000,
  leagueWeekEndFor: () => null,
  loadLeagueSnapshot: async () => ({ inLeague: false, weekEnd: null, savedAt: Date.now() }),
  onLeagueSnapshot: () => () => {},
  saveLeagueSnapshot: async () => {},
}));
jest.mock('@/services/league-api', () => ({ getLeague: jest.fn() }));
jest.mock('@/services/notification-scheduler', () => ({ syncNotifications: jest.fn().mockResolvedValue(undefined) }));

const boostInput = () => (syncNotifications as jest.Mock).mock.calls.at(-1)?.[0].boost;

beforeEach(() => (syncNotifications as jest.Mock).mockClear());

describe('useNotificationPlanner and the boost reminder', () => {
  it('plans it while rewarded boosts are on', async () => {
    mockAds = { usedToday: 1, dailyLimit: 6, nextAllowedAt: null, activeBoosts: 0, available: true, canWatch: true };
    renderHook(() => useNotificationPlanner());
    await waitFor(() => expect(syncNotifications).toHaveBeenCalled());
    expect(boostInput()).toEqual({ usedToday: 1, dailyLimit: 6 });
  });

  it('plans none when the server says rewarded ads are off (available: false)', async () => {
    mockAds = { usedToday: 0, dailyLimit: 6, nextAllowedAt: null, activeBoosts: 0, available: false, canWatch: false, unavailableReason: 'ads_not_configured' };
    renderHook(() => useNotificationPlanner());
    await waitFor(() => expect(syncNotifications).toHaveBeenCalled());
    expect(boostInput()).toBeNull();
  });

  it('keeps planning it with an older server that sends no `available`', async () => {
    mockAds = { usedToday: 0, dailyLimit: 3, nextAllowedAt: null, activeBoosts: 0 };
    renderHook(() => useNotificationPlanner());
    await waitFor(() => expect(syncNotifications).toHaveBeenCalled());
    expect(boostInput()).toEqual({ usedToday: 0, dailyLimit: 3 });
  });
});
