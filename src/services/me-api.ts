import { apiRequest } from '@/services/api';

export type Account = {
  id: string;
  name: string;
  email: string;
  provider: string;
  /** ISO-8601 UTC. */
  createdAt: string;
  inviteCode: string;
  /** Decimal, sent as a string. */
  balance: string;
  streak: number;
  league: number;
  hasUsedCode: boolean;
  onboardingComplete: boolean;
  /** ISO-8601 UTC; VIP time won in the tournament (in-app, not a purchase). */
  vipUntil: string | null;
  /** No interstitials for this account (sent by servers that support it). */
  adFree?: boolean;
  equippedFrame: string | null;
  ownedFrames: string[];
};

export type DeleteErrorCode = 'confirm_required';

export function getAccount(token: string): Promise<Account> {
  return apiRequest(token, 'GET', '/me');
}

/** Permanently erases the account and all of its data on the server. */
export function deleteAccount(token: string): Promise<{ ok: true }> {
  return apiRequest(token, 'DELETE', '/me', { confirm: 'DELETE' });
}

/** Stores the user's IANA time zone; the server uses it for the streak day. */
export function updateTimeZone(token: string, timezone: string): Promise<unknown> {
  return apiRequest(token, 'PATCH', '/me/timezone', { timezone });
}

/** Marks the welcome tour as seen so it isn't shown again on this account. */
export function completeOnboarding(token: string): Promise<{ ok: true }> {
  return apiRequest(token, 'POST', '/me/onboarding-complete');
}

/** Accounts that see no interstitials: ad-free, or VIP right now. */
export function isAdFree(account: Pick<Account, 'adFree' | 'vipUntil'>, now = Date.now()): boolean {
  return account.adFree === true || (!!account.vipUntil && Date.parse(account.vipUntil) > now);
}
