import { jwtIssuedAt, shouldRefreshToken } from '../token-refresh';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-03-20T12:00:00Z');

function jwt(payload: object) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

describe('jwtIssuedAt', () => {
  it('reads iat from a JWT', () => {
    expect(jwtIssuedAt(jwt({ sub: 'u1', iat: 1_773_000_000 }))).toBe(1_773_000_000_000);
  });

  it('is null for anything else', () => {
    expect(jwtIssuedAt('opaque-token')).toBeNull();
    expect(jwtIssuedAt(jwt({ sub: 'u1' }))).toBeNull();
    expect(jwtIssuedAt('a.%%%.c')).toBeNull();
  });
});

describe('shouldRefreshToken', () => {
  it('refreshes a token older than 7 days', () => {
    expect(shouldRefreshToken(now, now - 8 * DAY, null)).toBe(true);
    expect(shouldRefreshToken(now, now - 6 * DAY, null)).toBe(false);
  });

  it('refreshes a token of unknown age', () => {
    expect(shouldRefreshToken(now, null, null)).toBe(true);
  });

  it('tries at most once a day', () => {
    expect(shouldRefreshToken(now, now - 8 * DAY, now - 23 * 60 * 60 * 1000)).toBe(false);
    expect(shouldRefreshToken(now, now - 8 * DAY, now - 25 * 60 * 60 * 1000)).toBe(true);
  });
});
