import { deviceTimeZone } from '@/lib/timezone';
import { apiRequest } from '@/services/api';

// Fixed session length the backend uses; mirrors `endsAt - startedAt`. Only
// needed client-side as the progress-bar denominator while idle.
export const MINING_SESSION_MS = 24 * 60 * 60 * 1000;

export type MiningSession = {
  /** Pass to POST /mining/:sessionId/complete. */
  id: string;
  /** ISO-8601 UTC. */
  startedAt: string;
  /** ISO-8601 UTC. */
  endsAt: string;
  /** Ad boosts watched this session so far (max 8). */
  adBoosts: number;
  /** Milliseconds left as of `serverTime`. */
  remainingMs: number;
  /** CLB earned by this session so far; not yet settled into `balance`. */
  accruedClb: number;
};

/** Th/s contributed by each source; the parts add up to `currentThs`. */
export type ThsBreakdown = {
  base: number;
  friends: number;
  ads: number;
  league: number;
  steps: number;
};

export type MiningStatus = {
  /** ISO-8601 UTC; use it, not the device clock, if you need absolute time. */
  serverTime: string;
  /** Settled CLB balance, excluding the running session's accrual. Decimal, sent as a string. */
  balance: string;
  /** Steps the server counted for the running session (0 when idle). */
  todaySteps?: number;
  /** Consecutive UTC days with a mining session (computed on the server). */
  streak: number;
  /** False while the streak is alive only because today's mining hasn't happened yet. */
  streakMinedToday: boolean;
  /**
   * ISO-8601; when the streak ends unless the user mines (midnight of their local day). Null with no
   * streak; missing from servers that predate it.
   */
  streakExpiresAt?: string | null;
  /** The IANA zone the server counts streak days in; null until set. Missing from older servers. */
  timezone?: string | null;
  /** Current mining speed in Th/s (base speed even when idle). */
  currentThs: number;
  thsBreakdown: ThsBreakdown;
  /** Null when no session is running. */
  session: MiningSession | null;
};

export type CompletedSession = {
  id: string;
  userId: string;
  startedAt: string;
  endsAt: string;
  status: string;
  /** Decimal, sent as a string. */
  clbEarned: string;
  adBoosts: number;
};

export function getMiningStatus(token: string): Promise<MiningStatus> {
  return apiRequest(token, 'GET', '/mining/status');
}

/**
 * Minutes the device's local time is ahead of UTC (e.g. +180 for UTC+3); the server uses it for the
 * Night Owl badge. Still sent for servers that don't read `timezone`.
 */
export function localUtcOffsetMinutes(date = new Date()): number {
  return -date.getTimezoneOffset();
}

export function startMining(token: string): Promise<MiningStatus> {
  return apiRequest(token, 'POST', '/mining/start', {
    tzOffsetMinutes: localUtcOffsetMinutes(),
    timezone: deviceTimeZone() ?? undefined,
  });
}

/** Call after an ad finishes playing. Limited to one call per 30s, 8 per session. */
export function watchAd(token: string): Promise<MiningStatus> {
  return apiRequest(token, 'POST', '/mining/watch-ad');
}

/** Settles a session early. Not required - an expired session closes itself on the next status/start call. */
export function completeSession(token: string, sessionId: string): Promise<CompletedSession> {
  return apiRequest(token, 'POST', `/mining/${sessionId}/complete`);
}
