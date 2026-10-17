import { apiRequest } from '@/services/api';

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
};

export type FriendOverview = {
  inviteCode: string;
  /** True once this account has entered someone's invite code (allowed once). */
  hasUsedCode: boolean;
  welcomeBonusClb: number;
  bonusPerFriendThs: number;
  invitedCount: number;
  activeCount: number;
  totalBonusThs: number;
  friends: Friend[];
};

export type InviteErrorCode = 'invalid_format' | 'not_found' | 'own_code' | 'cycle' | 'already_referred';

export function getFriends(token: string): Promise<FriendOverview> {
  return apiRequest(token, 'GET', '/friends');
}

/** Redeems a friend's invite code. Resolves with the CLB welcome bonus granted. */
export function submitInviteCode(token: string, code: string): Promise<{ ok: true; bonusClb: number }> {
  return apiRequest(token, 'POST', '/friends/invite', { code: code.trim().toUpperCase() });
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Matches the backend's format: `CLB-` plus five letters/digits. */
export function isInviteCodeFormat(raw: string): boolean {
  return /^CLB-[A-Z0-9]{5}$/.test(normalizeInviteCode(raw));
}
