import { apiRequest } from '@/services/api';

/** Swaps a still-valid token for a fresh one. 404 on servers that predate it. */
export function refreshToken(token: string): Promise<{ token: string }> {
  return apiRequest(token, 'POST', '/auth/refresh');
}
