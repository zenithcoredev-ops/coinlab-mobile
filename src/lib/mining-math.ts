import type { MiningStatus } from '@/services/mining-api';

// Mirrors the backend's accrual rate (economy.js: BASE_SESSION_YIELD over
// SESSION_DURATION_MS at 1 Th/s). Used only to animate the balance between
// polls; the server's numbers replace it on every refresh and are authoritative.
const BASE_CLB_PER_SECOND = 2.4 / (24 * 60 * 60);

export function clbPerSecond(ths: number): number {
  return BASE_CLB_PER_SECOND * ths;
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
  return settled + session.accruedClb + (accruingMs / 1000) * clbPerSecond(status.currentThs);
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

export function formatClb(value: number): string {
  return value.toFixed(5);
}

/** A streak that is still alive but will expire at 00:00 UTC unless the user mines today. */
export function isStreakAtRisk(status: MiningStatus | null): boolean {
  return !!status && status.streak > 0 && !status.streakMinedToday;
}
