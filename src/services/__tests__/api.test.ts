import { ApiError, apiRequest, setUnauthorizedHandler } from '../api';

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    json: async () => body,
  }) as unknown as typeof fetch;
}

afterEach(() => setUnauthorizedHandler(null));

describe('apiRequest', () => {
  it('returns the parsed body and sends the bearer token', async () => {
    mockFetch(200, { ok: true });
    await expect(apiRequest('tok', 'GET', '/x')).resolves.toEqual({ ok: true });
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('throws ApiError carrying the backend message and code', async () => {
    mockFetch(400, { error: 'nope', code: 'already_referred' });
    const err = await apiRequest('t', 'POST', '/x', { a: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ message: 'nope', status: 400, code: 'already_referred' });
  });

  it('reads Retry-After on 429s', async () => {
    mockFetch(429, null, { 'Retry-After': '12' });
    const err = (await apiRequest('t', 'GET', '/x').catch((e) => e)) as ApiError;
    expect(err.retryAfterSec).toBe(12);
  });

  it('calls the unauthorized handler on 401', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { error: 'Account no longer exists', code: 'account_deleted' });
    await apiRequest('t', 'GET', '/x').catch(() => {});
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('t');
  });
});
