import type { TranslationKey } from '@/i18n';
import { ApiError, apiRequest } from '@/services/api';

export type Friend = {
  id: string;
  name: string;
  /** ISO-8601 UTC. */
  joinedAt: string;
  /** ISO-8601 UTC; null if the friend never mined. */
  lastMinedAt: string | null;
  /** Mined within the backend's activity window; only active friends add speed. */
  active: boolean;
  /** Th/s this friend currently adds to the user. */
  bonusThs: number;
  /** The same in CLB/h; missing from older servers. */
  bonusClbPerHour?: number;
};

export type FriendOverview = {
  inviteCode: string;
  /** True once this account has entered someone's invite code (allowed once). */
  hasUsedCode: boolean;
  welcomeBonusClb: number;
  bonusPerFriendThs: number;
  bonusPerFriendClbPerHour?: number;
  invitedCount: number;
  activeCount: number;
  totalBonusThs: number;
  totalBonusClbPerHour?: number;
  friends: Friend[];
};

export type InviteErrorCode = 'invalid_format' | 'not_found' | 'own_code' | 'cycle' | 'already_referred';

export function getFriends(token: string): Promise<FriendOverview> {
  return apiRequest(token, 'GET', '/friends');
}

/** Redeems a friend's invite code. Resolves with the CLB welcome bonus granted. */
export function submitInviteCode(token: string, code: string): Promise<{ ok: true; bonusClb: number }> {
  return apiRequest(token, 'POST', '/friends/invite', { code: normalizeInviteCode(code) });
}

/** Room for a long prefix plus a pasted space or two; the format check does the real work. */
export const INVITE_CODE_MAX_LENGTH = 20;

/**
 * What the user typed or pasted, as the server expects it: upper case, no spaces, and a plain dash
 * for the en/em dashes and minus signs keyboards and chat apps substitute. The prefix is left as
 * typed: the server maps old `CLB-` codes to their `WAGO-` form itself.
 */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/[\u2010-\u2015\u2212]/g, '-').toUpperCase();
}

/**
 * The backend's shape: a letters-only prefix, a dash and five letters/digits (`WAGO-AB3X9`, and the
 * older `CLB-AB3X9` the server still accepts). Any prefix length passes, so a renamed prefix keeps
 * working; the server decides whether the code exists.
 */
export function isInviteCodeFormat(raw: string): boolean {
  return /^[A-Z]{2,8}-[A-Z0-9]{5}$/.test(normalizeInviteCode(raw));
}

const INVITE_ERROR_KEYS: Record<InviteErrorCode, TranslationKey> = {
  invalid_format: 'friends.err.invalidFormat',
  not_found: 'friends.err.notFound',
  own_code: 'friends.err.ownCode',
  cycle: 'friends.err.cycle',
  already_referred: 'friends.err.alreadyReferred',
};

/** Translation key for a failed invite-code call, or undefined if the failure isn't a known one. */
export function inviteErrorKey(error: unknown): TranslationKey | undefined {
  if (!(error instanceof ApiError) || !error.code) return undefined;
  return INVITE_ERROR_KEYS[error.code as InviteErrorCode];
}
