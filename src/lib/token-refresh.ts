const DAY_MS = 24 * 60 * 60 * 1000;
/** Tokens older than this are swapped for a fresh one. */
export const TOKEN_REFRESH_AGE_MS = 7 * DAY_MS;
/** At most one refresh attempt per this long, whatever its outcome. */
export const TOKEN_REFRESH_RETRY_MS = DAY_MS;

/** When a JWT was issued (its `iat`, in ms), or null if `token` isn't one. */
export function jwtIssuedAt(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const iat = JSON.parse(json)?.iat;
    return typeof iat === 'number' ? iat * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Whether to ask for a new token now. An unknown issue time counts as old: sessions saved before
 * this was tracked may be close to expiring.
 */
export function shouldRefreshToken(now: number, issuedAt: number | null, lastAttemptAt: number | null): boolean {
  if (lastAttemptAt !== null && now - lastAttemptAt < TOKEN_REFRESH_RETRY_MS) return false;
  return issuedAt === null || now - issuedAt > TOKEN_REFRESH_AGE_MS;
}
