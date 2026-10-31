import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { ADS_SUPPORTED } from '@/ads/config';
import { ConsentState, gatherConsent, initializeAds, showPrivacyOptions } from '@/ads/consent';
import { flushImpressions } from '@/ads/impressions';
import { useSession } from '@/context/session';

type AdsState = ConsentState & {
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

  const apply = useCallback((next: ConsentState) => {
    setConsent(next);
    if (next.canRequestAds) initializeAds();
  }, []);

  useEffect(() => {
    if (ADS_SUPPORTED) gatherConsent().then(apply);
  }, [apply]);

  useEffect(() => {
    if (!ADS_SUPPORTED || !token) return;
    flushImpressions(token).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => s === 'active' && flushImpressions(token).catch(() => {}));
    return () => sub.remove();
  }, [token]);

  const openPrivacyOptions = useCallback(async () => {
    apply(await showPrivacyOptions());
  }, [apply]);

  const value = useMemo(() => ({ ...consent, openPrivacyOptions }), [consent, openPrivacyOptions]);
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds must be used inside AdsProvider');
  return ctx;
}
