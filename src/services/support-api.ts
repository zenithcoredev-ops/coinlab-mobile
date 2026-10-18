import { apiRequest, ApiError } from '@/services/api';
import type { TranslationKey } from '@/i18n';

export type SupportCategory = 'account' | 'mining' | 'league' | 'other';
export const SUPPORT_CATEGORIES: SupportCategory[] = ['account', 'mining', 'league', 'other'];

// Mirrors the backend limits; the server enforces them again.
export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 2000;

export type SupportTicket = {
  id: string;
  /** Human-friendly ticket number shown to the user. */
  number: number;
  category: SupportCategory;
  status: string;
  /** ISO-8601 UTC. */
  createdAt: string;
};

export type NewTicket = {
  category: SupportCategory;
  message: string;
  appVersion?: string;
  locale?: string;
};

export function createTicket(token: string, ticket: NewTicket): Promise<SupportTicket> {
  return apiRequest(token, 'POST', '/support/tickets', ticket);
}

export type MessageProblem = 'tooShort' | 'tooLong' | null;

export function messageProblem(message: string): MessageProblem {
  const length = message.trim().length;
  if (length < MIN_MESSAGE_LENGTH) return 'tooShort';
  if (length > MAX_MESSAGE_LENGTH) return 'tooLong';
  return null;
}

const CODE_KEYS: Record<string, TranslationKey> = {
  invalid_category: 'common.unknownError',
  message_too_short: 'support.err.tooShort',
  message_too_long: 'support.err.tooLong',
  too_many_open: 'support.err.tooManyOpen',
};

/** Translation key explaining why a ticket could not be sent. */
export function ticketErrorKey(error: unknown): TranslationKey {
  if (error instanceof ApiError) {
    if (error.code && CODE_KEYS[error.code]) return CODE_KEYS[error.code];
    if (error.status === 429) return 'support.err.rateLimited';
  }
  return 'support.err.failed';
}
