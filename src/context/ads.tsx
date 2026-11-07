import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { ADS_SUPPORTED, adUnitId } from '@/ads/config';
import { ConsentState, gatherConsent, initializeAds, showPrivacyOptions } from '@/ads/consent';
import { flushImpressions } from '@/ads/impressions';
import { useSession } from '@/context/session';
import { getAccount, isAdFree } from '@/services/me-api';

type AdsState = ConsentState & {
  /**
   * The mining-start interstitial may be shown: consent allows ads and the account is known not to be
   * ad-free/VIP (unknown, e.g. offline, counts as no, so a paying user never sees one by mistake).
   */
  interstitialsAllowed: boolean;
  /** The account is known to be ad-free/VIP; null until known. */
  adFree: boolean | null;
  /** The server has no rewarded ads (a 404/503 on creating an intent); hidden for the rest of the run. */
  rewardedUnavailable: boolean;
  markRewardedUnavailable: () => void;
  /**
   * The rewarded speed boost can be offered (for the boost reminder): supported, consented,
   * configured, not hidden after a 404/503, and never to ad-free/VIP accounts (unknown counts as
   * ad-free, as for the interstitial). The card adds the server's limits and a running session.
   */
  rewardedOffered: boolean;
  /** Profile → Privacy options. */
  openPrivacyOptions: () => Promise<void>;
};

const AdsContext = createContext<AdsState | null>(null);

/**
 * Runs Google's consent flow at launch and starts the Mobile Ads SDK only once ads may be requested.
 * Also sends the queued impression revenue whenever there is a session to send it with.
 */
export function AdsProvider({ children }: { children: ReactNode }) {
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const [consent, setConsent] = useState<ConsentState>({ canRequestAds: false, privacyOptionsRequired: false });
  const [adFree, setAdFree] = useState<boolean | null>(null);
  const [rewardedUnavailable, setRewardedUnavailable] = useState(false);
  const markRewardedUnavailable = useCallback(() => setRewardedUnavailable(true), []);

  const apply = useCallback((next: ConsentState) => {
    setConsent(next);
    if (next.canRequestAds) initializeAds();
  }, []);

  useEffect(() => {
    if (ADS_SUPPORTED) gatherConsent().then(apply);
  }, [apply]);

  useEffect(() => {
    setAdFree(null);
    if (!ADS_SUPPORTED || !token) return;
    let cancelled = false;
    const refresh = () => {
      flushImpressions(token).catch(() => {});
      getAccount(token)
        .then((account) => !cancelled && setAdFree(isAdFree(account)))
        .catch(() => {});
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [token]);

  const openPrivacyOptions = useCallback(async () => {
    apply(await showPrivacyOptions());
  }, [apply]);

  const value = useMemo(
    () => ({
      ...consent,
      interstitialsAllowed: consent.canRequestAds && adFree === false,
      adFree,
      rewardedUnavailable,
      markRewardedUnavailable,
      rewardedOffered: ADS_SUPPORTED && consent.canRequestAds && !!adUnitId('rewardedBoost') && !rewardedUnavailable && adFree === false,
      openPrivacyOptions,
    }),
    [consent, adFree, rewardedUnavailable, markRewardedUnavailable, openPrivacyOptions]
  );
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds must be used inside AdsProvider');
  return ctx;
}
