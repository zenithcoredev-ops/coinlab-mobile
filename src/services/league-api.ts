import { apiRequest } from '@/services/api';

export type LeagueState = 'locked' | 'active' | 'tournament';
export type LeagueZone = 'promote' | 'demote' | null;
export type ResultType = 'promote' | 'demote' | 'stay';

export type LeagueStanding = {
  rank: number;
  /** First name only; the server never sends other players' ids. */
  name: string;
  points: number;
  isYou: boolean;
  zone: LeagueZone;
};

export type LeagueResult = {
  /** ISO-8601 UTC end of the week this result is for; identifies the result. */
  weekEnd: string;
  resultType: ResultType;
  fromLeague: number;
  toLeague: number;
  rank: number | null;
  /** CLB earned that week. */
  points: number;
};

export type LeagueView = {
  serverTime: string;
  state: LeagueState;
  /** 0 = Bronze ... 9 = Diamond. */
  league: number;
  /** Permanent Th/s bonus of the current league. */
  speedBonus: number;
  entry: { required: number; balance: number };
  lastResult: LeagueResult | null;
  // The rest is only present when `state` is 'active'.
  weekEnd?: string;
  groupSize?: number;
  bands?: { promoteCount: number; demoteCount: number; tournamentCount: number };
  yourRank?: number;
  yourPoints?: number;
  standings?: LeagueStanding[];
};

export const LEAGUE_COUNT = 10;
export const DIAMOND_LEAGUE = LEAGUE_COUNT - 1;

export function getLeague(token: string): Promise<LeagueView> {
  return apiRequest(token, 'GET', '/league');
}

/** 0-1 progress toward the one-time CLB needed to join the leagues. */
export function entryProgress(entry: LeagueView['entry']): number {
  if (entry.required <= 0) return 1;
  return Math.min(Math.max(entry.balance / entry.required, 0), 1);
}

/** Milliseconds until the week ends, counted from when the snapshot was taken. */
export function msUntilWeekEnd(view: LeagueView, sinceFetchMs: number): number {
  if (!view.weekEnd) return 0;
  const left = Date.parse(view.weekEnd) - Date.parse(view.serverTime) - Math.max(0, sinceFetchMs);
  return Math.max(0, left);
}

/** `3d 4h`, `4h 12m` or `12m` - the week is long, so seconds would only be noise. */
export function formatWeekCountdown(ms: number): { days: number; hours: number; minutes: number } {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}
