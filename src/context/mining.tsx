import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/context/session';
import { ApiError } from '@/services/api';
import { getMiningStatus, MiningStatus, startMining } from '@/services/mining-api';

// Re-poll while mining so accrued CLB and boosts stay current; the countdown and
// balance animate locally between polls (see lib/mining-math).
const POLL_MS = 30_000;

type MiningState = {
  status: MiningStatus | null;
  /** Device time (ms) at which `status` was received; basis for local extrapolation. */
  fetchedAt: number;
  error: string | null;
  starting: boolean;
  refresh: () => Promise<void>;
  /** Resolves whether the session was started. */
  start: () => Promise<boolean>;
};

const MiningContext = createContext<MiningState | null>(null);

export function MiningProvider({ children }: { children: ReactNode }) {
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const refreshingRef = useRef(false);

  const apply = useCallback((next: MiningStatus) => {
    setStatus(next);
    setFetchedAt(Date.now());
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token || refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      apply(await getMiningStatus(token));
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : '');
    } finally {
      refreshingRef.current = false;
    }
  }, [token, apply]);

  const start = useCallback(async () => {
    if (!token) return false;
    setStarting(true);
    setError(null);
    try {
      apply(await startMining(token));
      return true;
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : '');
      return false;
    } finally {
      setStarting(false);
    }
  }, [token, apply]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasSession = !!status?.session;
  useEffect(() => {
    if (!hasSession) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [hasSession, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo(
    () => ({ status, fetchedAt, error, starting, refresh, start }),
    [status, fetchedAt, error, starting, refresh, start]
  );
  return <MiningContext.Provider value={value}>{children}</MiningContext.Provider>;
}

export function useMining() {
  const ctx = useContext(MiningContext);
  if (!ctx) throw new Error('useMining must be used inside MiningProvider');
  return ctx;
}
