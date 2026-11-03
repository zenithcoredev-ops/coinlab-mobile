import type { Language } from '@/i18n/translate';
import type { MiningStatus, ThsBreakdown } from '@/services/mining-api';

// Mirrors the backend's accrual rate (economy.js: BASE_SESSION_YIELD over
// SESSION_DURATION_MS at 1 Th/s). Used only to animate the balance between
// polls; the server's numbers replace it on every refresh and are authoritative.
const BASE_CLB_PER_SECOND = 2.4 / (24 * 60 * 60);

export function clbPerSecond(ths: number): number {
  return BASE_CLB_PER_SECOND * ths;
}

/** CLB a speed of 1 (the server's Th/s unit) collects in an hour: 2.4 CLB a day = 0.10 CLB/h. */
export const CLB_PER_HOUR_PER_UNIT = BASE_CLB_PER_SECOND * 3600;

/**
 * A speed from the server (in its Th/s unit) as the CLB it collects per hour, which is what the app
 * shows. Two decimals, or three when needed (0.20 → "0.02", 0.05 → "0.005", 1.25 → "0.125").
 */
export function formatRate(ths: number, language: Language): string {
  return formatClbPerHour(ths * CLB_PER_HOUR_PER_UNIT, language);
}

/**
 * A speed in CLB/h: the server's own CLB/h field when it sends one, else its Th/s value converted
 * (servers that predate the CLB/h fields).
 */
export function clbPerHourOf(serverClbPerHour: number | null | undefined, ths: number): number {
  return typeof serverClbPerHour === 'number' && Number.isFinite(serverClbPerHour) ? serverClbPerHour : ths * CLB_PER_HOUR_PER_UNIT;
}

/** CLB/h with two decimals, or three when needed ("0.10", "0.02", "0.005", "0.125"). */
export function formatClbPerHour(perHour: number, language: Language): string {
  return formatDecimal(perHour, perHour.toFixed(3).endsWith('0') ? 2 : 3, language);
}

/** The current speed in CLB/h from the mining status. */
export function statusClbPerHour(status: Pick<MiningStatus, 'clbPerHour' | 'currentThs'> | null | undefined): number {
  return status ? clbPerHourOf(status.clbPerHour, status.currentThs) : 0;
}

type AdsStatus = NonNullable<MiningStatus['ads']>;

/** How many rewarded boosts are running (servers send a list; older ones a count). */
export function activeBoostCount(ads: Pick<AdsStatus, 'activeBoosts'>): number {
  return Array.isArray(ads.activeBoosts) ? ads.activeBoosts.length : ads.activeBoosts;
}

/** What one rewarded view adds in CLB/h, or null when the server doesn't say. */
export function adBoostClbPerHour(ads: Pick<AdsStatus, 'clbPerHourBonus' | 'boostThs'>): number | null {
  if (typeof ads.clbPerHourBonus !== 'number' && typeof ads.boostThs !== 'number') return null;
  return clbPerHourOf(ads.clbPerHourBonus, ads.boostThs ?? 0);
}

/**
 * The running rewarded boosts together in CLB/h: the server's total, else the sum of the listed
 * boosts, else null (an older server that only sends a count).
 */
export function activeBoostsClbPerHour(ads: Pick<AdsStatus, 'activeBoosts' | 'activeClbPerHourBonus'>): number | null {
  if (typeof ads.activeClbPerHourBonus === 'number') return ads.activeClbPerHourBonus;
  if (!Array.isArray(ads.activeBoosts)) return null;
  return ads.activeBoosts.reduce((sum, b) => sum + clbPerHourOf(b.clbPerHourBonus, b.boostThs), 0);
}

/** One source of the speed breakdown in CLB/h. */
export function breakdownClbPerHour(
  status: Pick<MiningStatus, 'clbPerHourBreakdown' | 'thsBreakdown'> | null | undefined,
  key: keyof ThsBreakdown
): number {
  return status ? clbPerHourOf(status.clbPerHourBreakdown?.[key], status.thsBreakdown?.[key] ?? 0) : 0;
}

/** The CLB/h from the latest POST /steps/sync, with the session it was for and when it arrived. */
export type StepSyncBonus = { session: string; at: number; bonusClbPerHour: number };

/**
 * The speed the steps add, in CLB/h: the latest sync's value when it belongs to the running session
 * and arrived after the mining status was fetched, else the status breakdown.
 */
export function stepBonusClbPerHour(
  status: Pick<MiningStatus, 'clbPerHourBreakdown' | 'thsBreakdown' | 'session'> | null | undefined,
  fetchedAt: number,
  lastSync: StepSyncBonus | null
): number {
  const session = status?.session?.startedAt ?? null;
  if (lastSync && session && lastSync.session === session && lastSync.at > fetchedAt) return lastSync.bonusClbPerHour;
  return breakdownClbPerHour(status, 'steps');
}

/** A number with fixed decimals in the app language's style: "16,29171" in Turkish, "16.29171" in English. */
export function formatDecimal(value: number, digits: number, language: Language): string {
  const text = value.toFixed(digits);
  return language === 'tr' ? text.replace('.', ',') : text;
}

/** Milliseconds left in the running session, counting down from the last server snapshot. */
export function remainingSinceFetch(status: MiningStatus | null, sinceFetchMs: number): number {
  if (!status?.session) return 0;
  return Math.max(0, status.session.remainingMs - Math.max(0, sinceFetchMs));
}

/**
 * Settled balance plus what the running session has accrued: the server's
 * `accruedClb` as of the snapshot, extended locally for the time since then
 * (never past the session's end).
 */
export function liveBalanceAt(status: MiningStatus | null, sinceFetchMs: number): number {
  if (!status) return 0;
  const settled = parseFloat(status.balance);
  const session = status.session;
  if (!session) return settled;
  const accruingMs = Math.min(Math.max(0, sinceFetchMs), session.remainingMs);
  return settled + session.accruedClb + (accruingMs / 1000) * (statusClbPerHour(status) / 3600);
}

/** 0..1 share of the session already elapsed. */
export function sessionProgress(remainingMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - remainingMs / durationMs));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatClb(value: number, language: Language): string {
  return formatDecimal(value, 5, language);
}

/** Servers that send `streakExpiresAt` count streak days in the user's time zone; older ones in UTC. */
export function streakDayIsLocal(status: MiningStatus | null): boolean {
  return status?.streakExpiresAt !== undefined;
}

/** A streak that is still alive but will expire at the end of the day unless the user mines today. */
export function isStreakAtRisk(status: MiningStatus | null): boolean {
  return !!status && status.streak > 0 && !status.streakMinedToday;
}
