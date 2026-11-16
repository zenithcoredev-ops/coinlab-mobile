import { ApiError } from '@/services/api';
import { createRewardedIntent, getRewardedIntentStatus } from '@/services/ads-api';
import { runRewardedBoost } from '../rewarded';

jest.mock('react-native-google-mobile-ads', () => ({
  AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed', PAID: 'paid' },
  RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
  RewardedAd: { createForAdRequest: jest.fn() },
}));
jest.mock('@/services/ads-api', () => ({ createRewardedIntent: jest.fn(), getRewardedIntentStatus: jest.fn() }));
jest.mock('../impressions', () => ({
  impressionFromPaidEvent: (e: any, unit: string, format: string) => ({ unit, format, value: e.value }),
  recordImpression: jest.fn().mockResolvedValue(undefined),
}));

const intent = { intentId: 'int-1', ssv: { userId: 'user-42', customData: 'nonce-abc' }, expiresAt: '2026-10-31T20:00:00Z' };
const createIntent = createRewardedIntent as jest.Mock;
const getStatus = getRewardedIntentStatus as jest.Mock;
const noWait = () => Promise.resolve();

beforeEach(() => {
  jest.clearAllMocks();
  createIntent.mockResolvedValue(intent);
});

describe('runRewardedBoost', () => {
  it('shows the ad with the server’s SSV values unchanged and reports the reward only once the server grants it', async () => {
    const show = jest.fn().mockResolvedValue('earned');
    const onVerifying = jest.fn();
    const onGranted = jest.fn();
    getStatus.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'granted', clbPerHourBonus: 0.05 });
    expect(await runRewardedBoost('tok', 'unit-rw', { show, wait: noWait, onVerifying, onGranted })).toBe('granted');
    expect(onGranted).toHaveBeenCalledWith(0.05);
    expect(show).toHaveBeenCalledWith('unit-rw', { userId: 'user-42', customData: 'nonce-abc' }, expect.any(Function));
    expect(onVerifying).toHaveBeenCalledTimes(1);
    expect(getStatus).toHaveBeenCalledTimes(3);
    expect(getStatus).toHaveBeenCalledWith('tok', 'int-1');
  });

  it('reports a refused reward', async () => {
    const onGranted = jest.fn();
    getStatus.mockResolvedValueOnce({ status: 'granted' });
    expect(await runRewardedBoost('tok', 'u', { show: async () => 'earned', wait: noWait, onGranted })).toBe('granted');
    expect(onGranted).toHaveBeenCalledWith(null); // older server: no CLB/h in the answer
    getStatus.mockResolvedValue({ status: 'rejected' });
    expect(await runRewardedBoost('tok', 'u', { show: async () => 'earned', wait: noWait })).toBe('rejected');
  });

  it('says "pending" (not granted) when the server has not confirmed in time', async () => {
    getStatus.mockResolvedValue({ status: 'pending' });
    expect(await runRewardedBoost('tok', 'u', { show: async () => 'earned', wait: noWait, pollMs: 2000, waitMs: 6000 })).toBe('pending');
    expect(getStatus).toHaveBeenCalledTimes(4); // at 0, 2, 4 and 6 s
  });

  it('asks nothing of the server when the ad was closed early or never loaded', async () => {
    expect(await runRewardedBoost('tok', 'u', { show: async () => 'dismissed', wait: noWait })).toBe('dismissed');
    expect(await runRewardedBoost('tok', 'u', { show: async () => 'failed', wait: noWait })).toBe('noAd');
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('is "unavailable" when the server has no rewarded endpoints (404), without showing an ad', async () => {
    const show = jest.fn();
    createIntent.mockRejectedValue(new ApiError('Not found', 404));
    expect(await runRewardedBoost('tok', 'u', { show, wait: noWait })).toBe('unavailable');
    expect(show).not.toHaveBeenCalled();
    createIntent.mockRejectedValue(new ApiError('', 500));
    expect(await runRewardedBoost('tok', 'u', { show, wait: noWait })).toBe('error');
  });

  it('is "unavailable" when the server has no rewarded ad units (503 on intent), without showing an ad', async () => {
    const show = jest.fn();
    createIntent.mockRejectedValue(new ApiError('Service unavailable', 503));
    expect(await runRewardedBoost('tok', 'u', { show, wait: noWait })).toBe('unavailable');
    expect(show).not.toHaveBeenCalled();
  });

  it('says why it failed, as a short code for test builds', async () => {
    const onFailure = jest.fn();
    createIntent.mockRejectedValue(new ApiError('Rewarded ads are not available', 503, undefined, 'ads_not_configured'));
    await runRewardedBoost('tok', 'u', { show: jest.fn(), wait: noWait, onFailure });
    expect(onFailure).toHaveBeenLastCalledWith('intent:503:ads_not_configured');

    createIntent.mockRejectedValue(new ApiError('Too soon', 429, 60, 'too_soon'));
    expect(await runRewardedBoost('tok', 'u', { show: jest.fn(), wait: noWait, onFailure })).toBe('error');
    expect(onFailure).toHaveBeenLastCalledWith('intent:429:too_soon');

    createIntent.mockResolvedValue(intent);
    const show = jest.fn(async (_u: string, _s: unknown, onError?: (c: string) => void) => {
      onError?.('ad:googleMobileAds/no-fill');
      return 'failed' as const;
    });
    expect(await runRewardedBoost('tok', 'u', { show, wait: noWait, onFailure })).toBe('noAd');
    expect(onFailure).toHaveBeenLastCalledWith('ad:googleMobileAds/no-fill');
  });
});

describe('showRewardedAd', () => {
  type Fake = { listeners: Record<string, (e?: any) => void>; load: jest.Mock; show: jest.Mock };
  const setup = () => {
    let fake!: Fake;
    let mod!: typeof import('../rewarded') & { recorded: jest.Mock; create: jest.Mock };
    jest.isolateModules(() => {
      const create = require('react-native-google-mobile-ads').RewardedAd.createForAdRequest as jest.Mock;
      create.mockImplementation(() => {
        fake = { listeners: {}, load: jest.fn(), show: jest.fn().mockResolvedValue(undefined) };
        (fake as any).addAdEventListener = (t: string, fn: any) => (fake.listeners[t] = fn);
        return fake;
      });
      mod = { ...require('../rewarded'), recorded: require('../impressions').recordImpression, create };
    });
    return { mod, fake: () => fake };
  };

  it('passes the SSV user id and custom data to the ad request, shows it once loaded, and reports "earned"', async () => {
    const { mod, fake } = setup();
    const result = mod.showRewardedAd('unit-rw', { userId: 'user-42', customData: 'nonce-abc' });
    expect(mod.create).toHaveBeenCalledWith('unit-rw', { serverSideVerificationOptions: { userId: 'user-42', customData: 'nonce-abc' } });
    fake().listeners.rewarded_loaded();
    expect(fake().show).toHaveBeenCalled();
    fake().listeners.paid({ value: 0.02 });
    fake().listeners.rewarded_earned_reward({ type: 'boost', amount: 1 });
    fake().listeners.closed();
    expect(await result).toBe('earned');
    expect(mod.recorded).toHaveBeenCalledWith({ unit: 'unit-rw', format: 'rewarded', value: 0.02 });
  });

  it('reports "dismissed" when closed before the reward, and "failed" on an error', async () => {
    let { mod, fake } = setup();
    let result = mod.showRewardedAd('u', intent.ssv);
    fake().listeners.rewarded_loaded();
    fake().listeners.closed();
    expect(await result).toBe('dismissed');

    ({ mod, fake } = setup());
    const onError = jest.fn();
    result = mod.showRewardedAd('u', intent.ssv, onError);
    fake().listeners.error(Object.assign(new Error('no fill'), { code: 'googleMobileAds/no-fill' }));
    expect(await result).toBe('failed');
    expect(onError).toHaveBeenCalledWith('ad:googleMobileAds/no-fill');
  });

  it('gives up when no ad loads in time', async () => {
    jest.useFakeTimers();
    try {
      const { mod } = setup();
      const result = mod.showRewardedAd('u', intent.ssv);
      jest.advanceTimersByTime(15_000);
      expect(await result).toBe('failed');
    } finally {
      jest.useRealTimers();
    }
  });
});
