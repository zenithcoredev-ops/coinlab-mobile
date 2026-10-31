import { useCallback, useEffect } from 'react';

import { preloadMiningStartAd, showMiningStartAdIfReady } from '@/ads/interstitial';
import { useAds } from '@/context/ads';
import { useMining } from '@/context/mining';

/**
 * Starting a mining session, with the interstitial: the start request goes out first and is never
 * held up; only once the session has started is the ad shown, and only if one is already loaded.
 * Nothing is shown without ad consent, or to ad-free/VIP accounts.
 */
export function useStartMining(idle: boolean) {
  const { start } = useMining();
  const { interstitialsAllowed } = useAds();

  useEffect(() => {
    if (interstitialsAllowed && idle) preloadMiningStartAd();
  }, [interstitialsAllowed, idle]);

  return useCallback(async () => {
    const started = await start();
    if (started && interstitialsAllowed) showMiningStartAdIfReady();
  }, [start, interstitialsAllowed]);
}
