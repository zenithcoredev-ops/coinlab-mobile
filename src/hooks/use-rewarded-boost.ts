import { useCallback, useState } from 'react';

import { ADS_SUPPORTED, adUnitId } from '@/ads/config';
import { BoostOutcome, runRewardedBoost } from '@/ads/rewarded';
import { useAds } from '@/context/ads';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useNow } from '@/hooks/use-now';
import { adBoostClbPerHour } from '@/lib/mining-math';

export type BoostPhase = 'watching' | 'verifying' | null;
/** What to tell the user after a view; dismissing the ad says nothing. */
export type BoostMessage = Exclude<BoostOutcome, 'dismissed' | 'unavailable'> | null;

/**
 * The optional rewarded speed boost on the Mine screen. Shown only while mining, with ad consent,
 * when the server reports rewarded limits (status.ads with a daily limit above 0) and has the
 * endpoints and ad units (a 404 or 503 on creating an intent hides it).
 */
export function useRewardedBoost() {
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const { status, refresh } = useMining();
  const { canRequestAds, rewardedUnavailable: unavailable, markRewardedUnavailable } = useAds();
  const now = useNow(15_000);
  const [phase, setPhase] = useState<BoostPhase>(null);
  const [message, setMessage] = useState<BoostMessage>(null);
  /** What the last granted view added in CLB/h, when the server said. */
  const [grantedClbPerHour, setGrantedClbPerHour] = useState<number | null>(null);

  const unit = adUnitId('rewardedBoost');
  // No ads field, or a daily limit of 0, means rewarded boosts are off on the server.
  const ads = status?.ads && status.ads.dailyLimit > 0 ? status.ads : null;
  const visible = ADS_SUPPORTED && canRequestAds && !!unit && !!ads && !!status?.session && !unavailable;
  const limitReached = !!ads && ads.usedToday >= ads.dailyLimit;
  const waitMs = ads?.nextAllowedAt ? Math.max(0, Date.parse(ads.nextAllowedAt) - now) : 0;
  const canWatch = visible && !limitReached && waitMs === 0 && phase === null;

  const watch = useCallback(async () => {
    if (!token || !unit || phase) return;
    setPhase('watching');
    setMessage(null);
    setGrantedClbPerHour(null);
    const outcome = await runRewardedBoost(token, unit, {
      onVerifying: () => setPhase('verifying'),
      onGranted: (bonus) => setGrantedClbPerHour(bonus ?? (ads ? adBoostClbPerHour(ads) : null)),
    });
    setPhase(null);
    if (outcome === 'unavailable') markRewardedUnavailable();
    setMessage(outcome === 'dismissed' || outcome === 'unavailable' ? null : outcome);
    if (outcome === 'granted' || outcome === 'pending' || outcome === 'rejected') refresh();
  }, [token, unit, phase, refresh, ads, markRewardedUnavailable]);

  return { visible, ads, limitReached, waitMs, canWatch, phase, message, grantedClbPerHour, watch };
}
