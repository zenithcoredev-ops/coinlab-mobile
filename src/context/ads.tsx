import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { ADS_SUPPORTED } from '@/ads/config';
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
    () => ({ ...consent, interstitialsAllowed: consent.canRequestAds && adFree === false, openPrivacyOptions }),
    [consent, adFree, openPrivacyOptions]
  );
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds must be used inside AdsProvider');
  return ctx;
}
