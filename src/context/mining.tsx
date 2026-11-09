import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/context/session';
import { ApiError } from '@/services/api';
import { startOfLocalDay } from '@/lib/mining-math';
import { getMiningStatus, MiningStatus, startMining } from '@/services/mining-api';

// Re-poll while mining so accrued CLB and boosts stay current; the countdown and
// balance animate locally between polls (see lib/mining-math).
const POLL_MS = 30_000;
/** After local midnight, wait this long so the server's day has turned too, then refresh once. */
export const MIDNIGHT_REFRESH_DELAY_MS = 5_000;

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

  // "Collected today" starts again at local midnight (see liveCollectedTodayAt); fetch the server's
  // new day once then. Each refresh moves `fetchedAt`, so this runs once per midnight.
  const tracksToday = typeof status?.collectedToday === 'number';
  useEffect(() => {
    if (!tracksToday || !fetchedAt) return;
    // 30 h after today's start is always inside tomorrow, whatever daylight saving does to day length.
    const midnight = startOfLocalDay(startOfLocalDay(fetchedAt) + 30 * 60 * 60_000);
    const id = setTimeout(refresh, Math.max(0, midnight - Date.now()) + MIDNIGHT_REFRESH_DELAY_MS);
    return () => clearTimeout(id);
  }, [tracksToday, fetchedAt, refresh]);

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
