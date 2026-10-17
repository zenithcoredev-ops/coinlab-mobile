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
  /** Consecutive-day mining streak. */
  streak: number;
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

export function startMining(token: string): Promise<MiningStatus> {
  return apiRequest(token, 'POST', '/mining/start');
}

/** Call after an ad finishes playing. Limited to one call per 30s, 8 per session. */
export function watchAd(token: string): Promise<MiningStatus> {
  return apiRequest(token, 'POST', '/mining/watch-ad');
}

/** Settles a session early. Not required - an expired session closes itself on the next status/start call. */
export function completeSession(token: string, sessionId: string): Promise<CompletedSession> {
  return apiRequest(token, 'POST', `/mining/${sessionId}/complete`);
}
