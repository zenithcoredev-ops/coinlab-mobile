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
};

export type DeleteErrorCode = 'confirm_required' | 'pending_funds';

export function getAccount(token: string): Promise<Account> {
  return apiRequest(token, 'GET', '/me');
}

/** Permanently erases the account and all of its data on the server. */
export function deleteAccount(token: string): Promise<{ ok: true }> {
  return apiRequest(token, 'DELETE', '/me', { confirm: 'DELETE' });
}
