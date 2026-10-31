import { apiRequest } from '@/services/api';

/** POST /ads/impressions: one shown ad's revenue (from the SDK's paid event). */
export type AdImpression = {
  /** Random id per impression; lets the backend ignore a resent one. */
  clientEventId: string;
  adUnitId: string;
  format: 'interstitial' | 'rewarded';
  /** Exact micros as a decimal string. */
  valueMicros: string;
  currencyCode: string;
  /** UNKNOWN, ESTIMATED, PUBLISHER_PROVIDED or PRECISE. */
  precision: string;
  adSourceName: string | null;
  responseId: string | null;
};

export function logAdImpression(token: string, impression: AdImpression): Promise<unknown> {
  return apiRequest(token, 'POST', '/ads/impressions', impression);
}

/** POST /ads/rewarded/intent: one rewarded view; its ssv values go to the ad request unchanged. */
export type RewardedIntent = {
  intentId: string;
  ssv: { userId: string; customData: string };
  /** ISO-8601. */
  expiresAt: string;
};

/** Where a rewarded view stands: the reward exists only once AdMob's SSV callback reached the server. */
export type RewardedIntentStatus = 'pending' | 'granted' | 'rejected';

export function createRewardedIntent(token: string): Promise<RewardedIntent> {
  return apiRequest(token, 'POST', '/ads/rewarded/intent');
}

export async function getRewardedIntentStatus(token: string, intentId: string): Promise<RewardedIntentStatus> {
  const res = await apiRequest<{ status: RewardedIntentStatus }>(token, 'GET', `/ads/rewarded/${encodeURIComponent(intentId)}`);
  return res.status;
}
