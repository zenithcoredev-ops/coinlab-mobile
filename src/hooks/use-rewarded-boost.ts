import { useCallback, useState } from 'react';

import { ADS_SUPPORTED, adUnitId } from '@/ads/config';
import { BoostOutcome, runRewardedBoost } from '@/ads/rewarded';
import { useAds } from '@/context/ads';
import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { useNow } from '@/hooks/use-now';
import { rewardedAdsOn } from '@/services/mining-api';
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
  /** Why the last try failed, as a short code (shown in test builds). */
  const [failureCode, setFailureCode] = useState<string | null>(null);
  /** Rewarded boosts turned out to be off (404 / 503) while this card was on screen: say so once, then hide. */
  const [closedHere, setClosedHere] = useState(false);

  const unit = adUnitId('rewardedBoost');
  // No ads field, a daily limit of 0, or `available: false` means rewarded boosts are off on the
  // server: the card is left out entirely, without a word.
  const ads = rewardedAdsOn(status?.ads) ? status!.ads! : null;
  const visible = ADS_SUPPORTED && canRequestAds && !!unit && !!ads && !!status?.session && !unavailable;
  const limitReached = !!ads && ads.usedToday >= ads.dailyLimit;
  const waitMs = ads?.nextAllowedAt ? Math.max(0, Date.parse(ads.nextAllowedAt) - now) : 0;
  const canWatch = visible && !limitReached && waitMs === 0 && phase === null;

  const watch = useCallback(async () => {
    if (!token || !unit || phase) return;
    setPhase('watching');
    setMessage(null);
    setGrantedClbPerHour(null);
    setFailureCode(null);
    const outcome = await runRewardedBoost(token, unit, {
      onVerifying: () => setPhase('verifying'),
      onGranted: (bonus) => setGrantedClbPerHour(bonus ?? (ads ? adBoostClbPerHour(ads) : null)),
      onFailure: setFailureCode,
    });
    setPhase(null);
    if (outcome === 'unavailable') {
      // Off on the server (no ad units, no endpoints): not something a retry fixes. The card says so
      // here and is hidden from then on.
      setClosedHere(true);
      markRewardedUnavailable();
    }
    setMessage(outcome === 'dismissed' || outcome === 'unavailable' ? null : outcome);
    // Granted, pending, refused, or an error (a 429 limit, a 409 without a session): the status says
    // what the card should show next.
    if (outcome !== 'dismissed' && outcome !== 'unavailable' && outcome !== 'noAd') refresh();
  }, [token, unit, phase, refresh, ads, markRewardedUnavailable]);

  /** The card's closing note, while rewarded boosts were found off during this visit. */
  const closed = closedHere && unavailable;
  return { visible, closed, ads, limitReached, waitMs, canWatch, phase, message, grantedClbPerHour, failureCode, watch };
}
