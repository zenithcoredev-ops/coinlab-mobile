import { apiRequest } from '@/services/api';

export type BadgeId = 'night_owl' | 'week_streak' | 'first_friend' | 'diamond' | 'tournament' | 'champion';

export type Badge = {
  id: string;
  /** ISO-8601 UTC; null while the badge is still locked. */
  earnedAt: string | null;
};

export function getBadges(token: string): Promise<{ badges: Badge[] }> {
  return apiRequest(token, 'GET', '/badges');
}

/** Badges earned since the last time the user looked at the grid. */
export function newlyEarned(badges: Badge[], seenIds: string[]): string[] {
  return badges.filter((b) => b.earnedAt && !seenIds.includes(b.id)).map((b) => b.id);
}

export function earnedCount(badges: Badge[]): number {
  return badges.filter((b) => b.earnedAt).length;
}

/** Whole days of VIP left (rounded up), or 0 when there is none. */
export function vipDaysLeft(vipUntil: string | null, nowMs: number): number {
  if (!vipUntil) return 0;
  const left = Date.parse(vipUntil) - nowMs;
  return left > 0 ? Math.ceil(left / (24 * 3600_000)) : 0;
}
