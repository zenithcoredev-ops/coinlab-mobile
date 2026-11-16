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
  /** The server has no rewarded endpoints (404) or no rewarded ad units configured (503 on intent): hide the feature. */
  | 'unavailable'
  /** Anything else on the way (network, 409 no session, 429 limits, 5xx): worth trying again. */
  | 'error';

type ShowResult = 'earned' | 'dismissed' | 'failed';

const LOAD_TIMEOUT_MS = 15_000;

/**
 * Loads and shows one rewarded ad. The SSV user id and custom data are passed exactly as the server
 * gave them, so AdMob's callback to the server carries them back unchanged.
 */
export function showRewardedAd(unitId: string, ssv: RewardedIntent['ssv'], onError?: (code: string) => void): Promise<ShowResult> {
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
    const fail = (code: string) => {
      if (!settled) onError?.(code);
      finish('failed');
    };
    const timer = setTimeout(() => fail('ad:timeout'), LOAD_TIMEOUT_MS);
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(timer);
      ad.show().catch((e: unknown) => fail(`ad:show:${errorCode(e)}`));
    });
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'earned' : 'dismissed'));
    ad.addAdEventListener(AdEventType.ERROR, (e?: unknown) => (earned ? finish('earned') : fail(`ad:${errorCode(e)}`)));
    ad.addAdEventListener(AdEventType.PAID, (event) => {
      recordImpression(impressionFromPaidEvent(event, unitId, 'rewarded')).catch(() => {});
    });
    ad.load();
  });
}

/** A short code for an AdMob or API error, for test builds ("googleMobileAds/no-fill", "intent:503:ads_not_configured"). */
function errorCode(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e && typeof (e as { code: unknown }).code === 'string') return (e as { code: string }).code;
  return e instanceof Error ? e.message.slice(0, 60) : 'unknown';
}

const notFound = (e: unknown) => e instanceof ApiError && e.status === 404;
/** Creating an intent answers 503 when the server has no rewarded ad units (ADMOB_REWARDED_AD_UNITS unset). */
const intentUnavailable = (e: unknown) => notFound(e) || (e instanceof ApiError && e.status === 503);
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
    onGranted,
    onFailure,
  }: {
    pollMs?: number;
    waitMs?: number;
    wait?: (ms: number) => Promise<unknown>;
    show?: typeof showRewardedAd;
    onVerifying?: () => void;
    /** Called once the server confirmed the reward, with the boost in CLB/h when the server says. */
    onGranted?: (clbPerHourBonus: number | null) => void;
    /** Why it didn't work, as a short code (shown in test builds): "intent:503:ads_not_configured", "ad:googleMobileAds/no-fill". */
    onFailure?: (code: string) => void;
  } = {}
): Promise<BoostOutcome> {
  let intent: RewardedIntent;
  try {
    intent = await createRewardedIntent(token);
  } catch (e) {
    onFailure?.(e instanceof ApiError ? `intent:${e.status ?? 'network'}${e.code ? `:${e.code}` : ''}` : `intent:network`);
    return intentUnavailable(e) ? 'unavailable' : 'error';
  }

  let adError = 'ad:failed';
  const shown = await show(unitId, intent.ssv, (code) => (adError = code));
  if (shown === 'failed') {
    onFailure?.(adError);
    return 'noAd';
  }
  if (shown === 'dismissed') return 'dismissed';
  onVerifying?.();

  for (let waited = 0; ; waited += pollMs) {
    try {
      const { status, clbPerHourBonus } = await getRewardedIntentStatus(token, intent.intentId);
      if (status === 'granted') onGranted?.(typeof clbPerHourBonus === 'number' ? clbPerHourBonus : null);
      if (status === 'granted' || status === 'rejected') return status;
    } catch (e) {
      if (notFound(e)) {
        onFailure?.('status:404');
        return 'unavailable';
      }
    }
    if (waited >= waitMs) return 'pending';
    await wait(pollMs);
  }
}
