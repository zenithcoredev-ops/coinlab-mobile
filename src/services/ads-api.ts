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
