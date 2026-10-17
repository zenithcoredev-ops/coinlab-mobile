import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { clearStoredAuth, loadStoredAuth, saveStoredAuth, StoredAuth } from '@/services/auth-storage';

type SessionState = {
  /** False until the stored session has been read from disk. */
  ready: boolean;
  auth: StoredAuth | null;
  signIn: (auth: StoredAuth) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<StoredAuth | null>(null);

  useEffect(() => {
    loadStoredAuth()
      .then(setAuth)
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (next: StoredAuth) => {
    await saveStoredAuth(next);
    setAuth(next);
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredAuth();
    setAuth(null);
  }, []);

  const value = useMemo(() => ({ ready, auth, signIn, signOut }), [ready, auth, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
