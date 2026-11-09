import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { nextLeagueWeekEnd } from '@/lib/league-week';
import type { LeagueView } from '@/services/league-api';

const KEY = 'coinlab_league_cache';
/** Older than this, the app asks the server again on open. */
export const LEAGUE_CACHE_MAX_AGE_MS = 24 * 60 * 60_000;

/**
 * What the notifications need from the league (whether the user is in one, and when its week ends)
 * and what the Collect screen's league card shows. The card's fields are missing from copies saved
 * by older builds.
 */
export type LeagueSnapshot = {
  inLeague: boolean;
  weekEnd: string | null;
  savedAt: number;
  state?: LeagueView['state'];
  league?: number;
  rank?: number | null;
  promoteCount?: number;
  tournamentCount?: number;
  entryRequired?: number;
};

export function leagueSnapshotOf(view: LeagueView, now = Date.now()): LeagueSnapshot {
  const tournamentEnd = view.tournament && !view.tournament.pending ? view.tournament.weekEnd : null;
  const inLeague = view.state === 'active' || view.state === 'tournament';
  return {
    inLeague,
    weekEnd: tournamentEnd ?? view.weekEnd ?? null,
    savedAt: now,
    state: view.state,
    league: view.league,
    rank: view.yourRank ?? null,
    promoteCount: view.bands?.promoteCount,
    tournamentCount: view.bands?.tournamentCount,
    entryRequired: view.entry.required,
  };
}

const listeners = new Set<(s: LeagueSnapshot) => void>();

/** Lets the notification planner react when the league screen loads fresh data. */
export function onLeagueSnapshot(listener: (s: LeagueSnapshot) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function saveLeagueSnapshot(view: LeagueView, now = Date.now()): Promise<void> {
  const snapshot = leagueSnapshotOf(view, now);
  await AsyncStorage.setItem(KEY, JSON.stringify(snapshot)).catch(() => {});
  listeners.forEach((l) => l(snapshot));
}

/** The latest snapshot, for screens: saved copy first, then every new save. */
export function useLeagueSnapshot(): LeagueSnapshot | null {
  const [snapshot, setSnapshot] = useState<LeagueSnapshot | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLeagueSnapshot().then((s) => !cancelled && s && setSnapshot((now) => now ?? s));
    const stop = onLeagueSnapshot(setSnapshot);
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return snapshot;
}

export async function loadLeagueSnapshot(): Promise<LeagueSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LeagueSnapshot) : null;
  } catch {
    return null;
  }
}

/**
 * When the league week the reminder is for ends: the saved one while still ahead, else the next
 * Monday 00:00 UTC (the user stays in their league across weeks). Null outside a league.
 */
export function leagueWeekEndFor(snapshot: LeagueSnapshot | null, now: Date): Date | null {
  if (!snapshot?.inLeague) return null;
  const saved = snapshot.weekEnd ? Date.parse(snapshot.weekEnd) : NaN;
  return saved > now.getTime() ? new Date(saved) : nextLeagueWeekEnd(now);
}
