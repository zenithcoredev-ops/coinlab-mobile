import { useCallback, useState } from 'react';

import { ADS_SUPPORTED, adUnitId } from '@/ads/config';
import { BoostOutcome, runRewardedBoost } from '@/ads/rewarded';
import { useAds } from '@/context/ads';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useNow } from '@/hooks/use-now';

export type BoostPhase = 'watching' | 'verifying' | null;
/** What to tell the user after a view; dismissing the ad says nothing. */
export type BoostMessage = Exclude<BoostOutcome, 'dismissed' | 'unavailable'> | null;

/**
 * The optional rewarded speed boost on the Mine screen. Shown only while mining, with ad consent,
 * when the server reports rewarded limits (status.ads) and has the endpoints (a 404 hides it).
 */
export function useRewardedBoost() {
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const { status, refresh } = useMining();
  const { canRequestAds } = useAds();
  const now = useNow(15_000);
  const [unavailable, setUnavailable] = useState(false);
  const [phase, setPhase] = useState<BoostPhase>(null);
  const [message, setMessage] = useState<BoostMessage>(null);

  const unit = adUnitId('rewardedBoost');
  const ads = status?.ads ?? null;
  const visible = ADS_SUPPORTED && canRequestAds && !!unit && !!ads && !!status?.session && !unavailable;
  const limitReached = !!ads && ads.usedToday >= ads.dailyLimit;
  const waitMs = ads?.nextAllowedAt ? Math.max(0, Date.parse(ads.nextAllowedAt) - now) : 0;
  const canWatch = visible && !limitReached && waitMs === 0 && phase === null;

  const watch = useCallback(async () => {
    if (!token || !unit || phase) return;
    setPhase('watching');
    setMessage(null);
    const outcome = await runRewardedBoost(token, unit, { onVerifying: () => setPhase('verifying') });
    setPhase(null);
    if (outcome === 'unavailable') setUnavailable(true);
    setMessage(outcome === 'dismissed' || outcome === 'unavailable' ? null : outcome);
    if (outcome === 'granted' || outcome === 'pending' || outcome === 'rejected') refresh();
  }, [token, unit, phase, refresh]);

  return { visible, ads, limitReached, waitMs, canWatch, phase, message, watch };
}
