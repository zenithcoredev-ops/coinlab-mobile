import { API_URL } from '@/constants/config';

export class ApiError extends Error {
  constructor(
    /** The backend's `error` text; empty when the response had none. */
    message: string,
    public status?: number,
    /** Present on 429s - seconds to wait before retrying. */
    public retryAfterSec?: number,
    /** Machine-readable reason from the backend (e.g. `already_referred`), when it sends one. */
    public code?: string
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

/** Called when the backend rejects the token (expired, or the account was deleted). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function apiRequest<T>(
  token: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PUT',
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401) onUnauthorized?.();
  if (!res.ok) {
    const retryAfterSec = data?.retryAfterSec ?? parseRetryAfter(res.headers.get('Retry-After'));
    throw new ApiError(data?.error ?? '', res.status, retryAfterSec, data?.code);
  }
  return data as T;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : undefined;
}
