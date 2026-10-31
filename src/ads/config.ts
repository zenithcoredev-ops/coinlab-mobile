import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

import ads from '../../ads.config.json';

/**
 * Where ads appear. The real unit ids go in ads.config.json (with the app ids); until then, and in
 * every development build, Google's test ids are used: real ids must never be tested against.
 */
export type AdPlacement = 'interstitialMiningStart' | 'rewardedBoost';

/** Ads run on Android only (the app's home-screen widgets, Health Connect and store listing are Android). */
export const ADS_SUPPORTED = Platform.OS === 'android';

export function adUnitId(placement: AdPlacement, { dev = __DEV__ }: { dev?: boolean } = {}): string | null {
  if (!ADS_SUPPORTED) return null;
  if (ads.useTestIds || dev) return placement === 'interstitialMiningStart' ? TestIds.INTERSTITIAL : TestIds.REWARDED;
  return ads.adUnits[placement] || null;
}
