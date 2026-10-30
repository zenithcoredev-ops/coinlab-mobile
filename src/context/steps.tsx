import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import {
  getStepsAvailability,
  hasBackgroundStepsAccess,
  openHealthConnectStore,
  readVerifiedSteps,
  requestBackgroundStepsAccess,
  requestStepsPermission,
  StepsAvailability,
} from '@/services/health-connect';
import { syncSteps } from '@/services/steps-api';

// The server allows 6 reports a minute; we report far less often and only while a session runs.
const MIN_SYNC_GAP_MS = 60_000;
const SYNC_INTERVAL_MS = 5 * 60_000;

type StepsState = {
  availability: StepsAvailability;
  /** Steps the server counted for the running session. */
  steps: number;
  syncing: boolean;
  syncFailed: boolean;
  /**
   * Steps may be read while the app is closed too (keeps the home-screen widget's count fresh).
   * Also true once asked this session, so a device that can't grant it isn't asked again and again.
   */
  backgroundAccess: boolean;
  /** Asks for background reading on its own (for users who connected before it was asked). */
  allowBackground: () => Promise<void>;
  /** Asks for Health Connect access, then syncs. */
  connect: () => Promise<void>;
  openStore: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const StepsContext = createContext<StepsState | null>(null);

export function StepsProvider({ children }: { children: ReactNode }) {
  const { auth } = useSession();
  const { status, refresh } = useMining();
  const token = auth?.token ?? null;
  const session = status?.session ?? null;
  const sessionStartedAt = session?.startedAt ?? null;

  const [availability, setAvailability] = useState<StepsAvailability>('unsupported');
  const [syncing, setSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [backgroundAccess, setBackgroundAccess] = useState(false);
  const backgroundAskedRef = useRef(false);
  const lastSyncRef = useRef(0);
  const busyRef = useRef(false);

  const checkAvailability = useCallback(async () => {
    const next = await getStepsAvailability();
    setAvailability(next);
    setBackgroundAccess(backgroundAskedRef.current || (next === 'ready' && (await hasBackgroundStepsAccess())));
    return next;
  }, []);

  const runSync = useCallback(
    async (force: boolean) => {
      if (!token || !sessionStartedAt || availability !== 'ready' || busyRef.current) return;
      if (!force && Date.now() - lastSyncRef.current < MIN_SYNC_GAP_MS) return;
      busyRef.current = true;
      setSyncing(true);
      try {
        const steps = await readVerifiedSteps(sessionStartedAt);
        await syncSteps(token, steps);
        lastSyncRef.current = Date.now();
        setSyncFailed(false);
        await refresh();
      } catch {
        setSyncFailed(true);
      } finally {
        busyRef.current = false;
        setSyncing(false);
      }
    },
    [token, sessionStartedAt, availability, refresh]
  );

  const syncNow = useCallback(() => runSync(true), [runSync]);

  const allowBackground = useCallback(async () => {
    backgroundAskedRef.current = true;
    setBackgroundAccess(true);
    await requestBackgroundStepsAccess();
  }, []);

  const connect = useCallback(async () => {
    if (await requestStepsPermission()) await checkAvailability();
  }, [checkAvailability]);

  // Re-check when returning to the app: the user may have installed Health Connect or changed
  // the permission in its settings.
  useEffect(() => {
    checkAvailability();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkAvailability().then(() => runSync(false));
      }
    });
    return () => sub.remove();
  }, [checkAvailability, runSync]);

  const ready = availability === 'ready' && !!sessionStartedAt;
  useEffect(() => {
    if (!ready) return;
    runSync(false);
    const id = setInterval(() => runSync(false), SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ready, runSync]);

  const value = useMemo<StepsState>(
    () => ({
      availability,
      steps: session ? (status?.todaySteps ?? 0) : 0,
      syncing,
      syncFailed,
      backgroundAccess,
      allowBackground,
      connect,
      openStore: openHealthConnectStore,
      syncNow,
    }),
    [availability, session, status?.todaySteps, syncing, syncFailed, backgroundAccess, allowBackground, connect, syncNow]
  );
  return <StepsContext.Provider value={value}>{children}</StepsContext.Provider>;
}

export function useSteps() {
  const ctx = useContext(StepsContext);
  if (!ctx) throw new Error('useSteps must be used inside StepsProvider');
  return ctx;
}
