import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

import { adUnitId } from './config';
import { impressionFromPaidEvent, recordImpression } from './impressions';

let ad: InterstitialAd | null = null;
let loaded = false;

/**
 * Loads the mining-start interstitial ahead of time (on the Mine screen), so showing it never makes
 * anyone wait. A failed load is simply dropped; the next preload tries again.
 */
export function preloadMiningStartAd(): void {
  const unit = adUnitId('interstitialMiningStart');
  if (ad || !unit) return;
  const next = InterstitialAd.createForAdRequest(unit);
  const reset = () => {
    if (ad === next) {
      ad = null;
      loaded = false;
    }
  };
  next.addAdEventListener(AdEventType.LOADED, () => {
    if (ad === next) loaded = true;
  });
  next.addAdEventListener(AdEventType.ERROR, reset);
  next.addAdEventListener(AdEventType.CLOSED, reset);
  next.addAdEventListener(AdEventType.PAID, (event) => {
    recordImpression(impressionFromPaidEvent(event, unit, 'interstitial')).catch(() => {});
  });
  ad = next;
  next.load();
}

/**
 * Shows the interstitial if one is ready; otherwise does nothing. Called after the mining start
 * request has already been sent, so the ad never delays or blocks mining.
 */
export function showMiningStartAdIfReady(): boolean {
  if (!ad || !loaded) return false;
  const showing = ad;
  ad = null;
  loaded = false;
  showing.show().catch(() => {});
  return true;
}
