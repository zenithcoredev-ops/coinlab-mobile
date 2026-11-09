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

export type ActiveAdBoost = {
  /** ISO-8601. */
  startsAt: string;
  endsAt: string;
  boostThs: number;
  /** The same boost in CLB/h; missing from older servers. */
  clbPerHourBonus?: number;
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
  /** The streak through the last day covered before streakExpiresAt (when the server sends it). */
  streakAtExpiry?: number;
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
  /** The same speed in CLB/h, which the app shows; missing from older servers (then converted from Th/s). */
  clbPerHour?: number;
  /** `thsBreakdown` in CLB/h, same keys; missing from older servers. */
  clbPerHourBreakdown?: ThsBreakdown;
  /** Null when no session is running. */
  session: MiningSession | null;
  /**
   * Wago collected on the user's local day so far (sessions, tasks, bonuses). Missing from servers
   * that don't send it yet; the Collect screen then leaves out its "collected today" strip.
   */
  collectedToday?: number;
  /** ISO-8601 server time `collectedToday` was counted at; the app runs it on from there. */
  collectedTodayAsOf?: string;
  /** Rewarded speed boosts; missing from servers without them (then the rewarded ad stays hidden). */
  ads?: {
    usedToday: number;
    dailyLimit: number;
    /** ISO-8601; the next rewarded view is allowed from then (null: now). */
    nextAllowedAt: string | null;
    /** The running boosts: a list from current servers, a count from older ones. */
    activeBoosts: number | ActiveAdBoost[];
    /** What one view adds, in Th/s and CLB/h; missing from older servers. */
    boostThs?: number;
    clbPerHourBonus?: number;
    /** All running boosts together in CLB/h; missing from older servers. */
    activeClbPerHourBonus?: number;
  };
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

/** Settles a session early. Not required - an expired session closes itself on the next status/start call. */
export function completeSession(token: string, sessionId: string): Promise<CompletedSession> {
  return apiRequest(token, 'POST', `/mining/${sessionId}/complete`);
}
