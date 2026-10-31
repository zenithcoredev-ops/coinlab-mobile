import { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

import { ApiError } from '@/services/api';
import { createRewardedIntent, getRewardedIntentStatus, RewardedIntent } from '@/services/ads-api';
import { impressionFromPaidEvent, recordImpression } from './impressions';

/** How one rewarded view ended, from the user's point of view. */
export type BoostOutcome =
  /** The server confirmed AdMob's SSV callback: the boost is on. */
  | 'granted'
  /** Watched, but the server hasn't confirmed yet (it will add the boost when it does). */
  | 'pending'
  /** The server refused the reward (e.g. limit reached, invalid callback). */
  | 'rejected'
  /** Closed before the reward. */
  | 'dismissed'
  /** No ad could be loaded or shown. */
  | 'noAd'
  /** The server has no rewarded endpoints (404): hide the feature. */
  | 'unavailable'
  | 'error';

type ShowResult = 'earned' | 'dismissed' | 'failed';

const LOAD_TIMEOUT_MS = 15_000;

/**
 * Loads and shows one rewarded ad. The SSV user id and custom data are passed exactly as the server
 * gave them, so AdMob's callback to the server carries them back unchanged.
 */
export function showRewardedAd(unitId: string, ssv: RewardedIntent['ssv']): Promise<ShowResult> {
  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(unitId, {
      serverSideVerificationOptions: { userId: ssv.userId, customData: ssv.customData },
    });
    let earned = false;
    let settled = false;
    const finish = (result: ShowResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => finish('failed'), LOAD_TIMEOUT_MS);
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(timer);
      ad.show().catch(() => finish('failed'));
    });
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'earned' : 'dismissed'));
    ad.addAdEventListener(AdEventType.ERROR, () => finish(earned ? 'earned' : 'failed'));
    ad.addAdEventListener(AdEventType.PAID, (event) => {
      recordImpression(impressionFromPaidEvent(event, unitId, 'rewarded')).catch(() => {});
    });
    ad.load();
  });
}

const notFound = (e: unknown) => e instanceof ApiError && e.status === 404;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One rewarded speed boost: ask the server for an intent, show the ad with its SSV values, then wait
 * for the server to confirm. The reward is only ever reported once the server says "granted"; the
 * client's own "earned" event grants nothing.
 */
export async function runRewardedBoost(
  token: string,
  unitId: string,
  {
    pollMs = 2000,
    waitMs = 20_000,
    wait = sleep,
    show = showRewardedAd,
    onVerifying,
  }: { pollMs?: number; waitMs?: number; wait?: (ms: number) => Promise<unknown>; show?: typeof showRewardedAd; onVerifying?: () => void } = {}
): Promise<BoostOutcome> {
  let intent: RewardedIntent;
  try {
    intent = await createRewardedIntent(token);
  } catch (e) {
    return notFound(e) ? 'unavailable' : 'error';
  }

  const shown = await show(unitId, intent.ssv);
  if (shown === 'failed') return 'noAd';
  if (shown === 'dismissed') return 'dismissed';
  onVerifying?.();

  for (let waited = 0; ; waited += pollMs) {
    try {
      const status = await getRewardedIntentStatus(token, intent.intentId);
      if (status === 'granted' || status === 'rejected') return status;
    } catch (e) {
      if (notFound(e)) return 'unavailable';
    }
    if (waited >= waitMs) return 'pending';
    await wait(pollMs);
  }
}
