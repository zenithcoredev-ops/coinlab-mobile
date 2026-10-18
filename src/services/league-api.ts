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
  /** Equipped cosmetic frame id, if any. */
  frame?: string | null;
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

export type TournamentStage = 'qf' | 'sf' | 'final';

export type TournamentReward = { clb: number; vipDays: number; frame: string };

export type TournamentRewardRow = TournamentReward & { rank: number };

/** The user's current stage; `pending` while the bracket is still being formed. */
export type TournamentView =
  | { pending: true; stage: TournamentStage }
  | {
      pending: false;
      stage: TournamentStage;
      stageNumber: number;
      stageCount: number;
      weekEnd: string;
      size: number;
      /** How many of `size` move on; 0 in the final. */
      advanceCount: number;
      yourRank: number;
      yourPoints: number;
      /** `zone` is 'promote' for advancing rows and 'demote' for eliminated ones. */
      standings: LeagueStanding[];
    };

export type TournamentResult = {
  /** Bracket id; identifies the result so the banner is shown once. */
  id: string;
  stage: TournamentStage;
  outcome: 'advanced' | 'eliminated' | 'final';
  rank: number;
  /** Only on a rewarded final placement. */
  reward: TournamentReward | null;
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
  tournamentResult: TournamentResult | null;
  tournamentRewards: TournamentRewardRow[];
  tournament?: TournamentView;
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

/** A `LeagueView` whose tournament bracket exists (not still being formed). */
export type LiveTournamentLeagueView = LeagueView & { tournament: Extract<TournamentView, { pending: false }> };

export function isTournamentLive(view: LeagueView): view is LiveTournamentLeagueView {
  return view.state === 'tournament' && !!view.tournament && !view.tournament.pending;
}

/** 0-1 progress toward the one-time CLB needed to join the leagues. */
export function entryProgress(entry: LeagueView['entry']): number {
  if (entry.required <= 0) return 1;
  return Math.min(Math.max(entry.balance / entry.required, 0), 1);
}

/** Milliseconds until the league week (or tournament stage) ends, counted from when the snapshot was taken. */
export function msUntilWeekEnd(view: LeagueView, sinceFetchMs: number): number {
  const end = view.weekEnd ?? (view.tournament && !view.tournament.pending ? view.tournament.weekEnd : undefined);
  if (!end) return 0;
  const left = Date.parse(end) - Date.parse(view.serverTime) - Math.max(0, sinceFetchMs);
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
