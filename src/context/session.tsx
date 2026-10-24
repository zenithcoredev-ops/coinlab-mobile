import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { setUnauthorizedHandler } from '@/services/api';
import { completeOnboarding as completeOnboardingRequest, getAccount } from '@/services/me-api';
import { signOutGoogle } from '@/services/google-auth';
import { cancelStreakReminder } from '@/services/streak-reminder';
import { clearWidget } from '@/widget/sync';
import { clearStoredAuth, loadStoredAuth, saveStoredAuth, StoredAuth } from '@/services/auth-storage';

/** 'unknown' until the server has said whether this account has seen the welcome tour. */
export type OnboardingState = 'unknown' | 'pending' | 'done';

type SessionState = {
  /** False until the stored session has been read from disk. */
  ready: boolean;
  auth: StoredAuth | null;
  signIn: (auth: StoredAuth) => Promise<void>;
  signOut: () => Promise<void>;
  onboarding: OnboardingState;
  completeOnboarding: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState>('unknown');

  useEffect(() => {
    loadStoredAuth()
      .then(setAuth)
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (next: StoredAuth) => {
    await saveStoredAuth(next);
    setAuth(next);
  }, []);

  const tokenRef = useRef<string | null>(null);
  tokenRef.current = auth?.token ?? null;
  const endingRef = useRef(false);

  // The one way a session ends, for sign-out and for a rejected token alike. Concurrent calls
  // (several requests can get a 401 at once) collapse into one; the navigator reacts to `auth`
  // becoming null and shows sign-in, so nothing here navigates.
  const endSession = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      await cancelStreakReminder();
      await clearWidget().catch(() => {});
      await clearStoredAuth().catch(() => {});
    } finally {
      tokenRef.current = null;
      setAuth(null);
      endingRef.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutGoogle().catch(() => {});
    await endSession();
  }, [endSession]);

  // A 401 means that token is no longer valid; drop back to sign-in. A late 401 for a token we
  // already replaced or cleared (a slow request from before sign-out/sign-in) must not end the
  // current session.
  useEffect(() => {
    setUnauthorizedHandler((rejectedToken) => {
      if (rejectedToken === tokenRef.current) endSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // Ask the server whether the tour has been seen. If we can't reach it, don't block the
  // app behind the tour; it will be offered again next launch because the flag stays false.
  const token = auth?.token ?? null;
  useEffect(() => {
    if (!token) {
      setOnboarding('unknown');
      return;
    }
    let cancelled = false;
    getAccount(token)
      .then((account) => !cancelled && setOnboarding(account.onboardingComplete ? 'done' : 'pending'))
      .catch(() => !cancelled && setOnboarding('done'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const completeOnboarding = useCallback(async () => {
    setOnboarding('done');
    if (token) await completeOnboardingRequest(token).catch(() => {});
  }, [token]);

  const value = useMemo(
    () => ({ ready, auth, signIn, signOut, onboarding, completeOnboarding }),
    [ready, auth, signIn, signOut, onboarding, completeOnboarding]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
