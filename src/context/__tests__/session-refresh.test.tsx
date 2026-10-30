import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { AppState } from 'react-native';

import { SessionProvider, useSession } from '../session';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/services/google-auth', () => ({ signOutGoogle: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/services/streak-reminder', () => ({ cancelStreakReminder: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/widget/sync', () => ({ clearWidget: jest.fn().mockResolvedValue(undefined) }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const DAY = 24 * 60 * 60 * 1000;

let refreshResponse: { status: number; body: unknown };
const fetchMock = jest.fn(async (url: string, _init?: RequestInit) => {
  const path = new URL(String(url)).pathname;
  const { status, body } = path === '/auth/refresh' ? refreshResponse : { status: 200, body: { onboardingComplete: true } };
  return { ok: status < 300, status, headers: { get: () => null }, json: async () => body };
});
const refreshCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'));

let appStateListener: ((state: string) => void) | null = null;

async function start(stored: object) {
  await AsyncStorage.setItem('coinlab_auth', JSON.stringify(stored));
  const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;
  const hook = renderHook(() => useSession(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  fetchMock.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  refreshResponse = { status: 200, body: { token: 'fresh' } };
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
});

describe('token refresh', () => {
  it('swaps a token older than 7 days for a fresh one and saves it', async () => {
    const { result } = await start({ token: 'old', name: 'Kazim', issuedAt: Date.now() - 8 * DAY });
    await waitFor(() => expect(result.current.auth?.token).toBe('fresh'));
    expect(refreshCalls()[0][1]).toMatchObject({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer old' }) });
    const saved = JSON.parse(await AsyncStorage.getItem('coinlab_auth'));
    expect(saved).toMatchObject({ token: 'fresh', name: 'Kazim' });
    expect(Date.now() - saved.issuedAt).toBeLessThan(60_000);
  });

  it('leaves a newer token alone', async () => {
    const { result } = await start({ token: 'recent', name: 'Kazim', issuedAt: Date.now() - 2 * DAY });
    await act(async () => appStateListener?.('active'));
    expect(refreshCalls()).toHaveLength(0);
    expect(result.current.auth?.token).toBe('recent');
  });

  it('keeps the session when the server has no refresh endpoint (404)', async () => {
    refreshResponse = { status: 404, body: { error: 'Not found' } };
    const { result } = await start({ token: 'old', name: 'Kazim' });
    await waitFor(() => expect(refreshCalls()).toHaveLength(1));
    await act(async () => {});
    expect(result.current.auth?.token).toBe('old');
  });

  it('signs out when the server rejects the token (401)', async () => {
    refreshResponse = { status: 401, body: { error: 'Invalid or expired token' } };
    const { result } = await start({ token: 'old', name: 'Kazim', issuedAt: Date.now() - 30 * DAY });
    await waitFor(() => expect(result.current.auth).toBeNull());
    expect(await AsyncStorage.getItem('coinlab_auth')).toBeNull();
  });

  it('tries at most once a day, also across returns to the app', async () => {
    refreshResponse = { status: 404, body: {} };
    await start({ token: 'old', name: 'Kazim', issuedAt: Date.now() - 8 * DAY });
    await waitFor(() => expect(refreshCalls()).toHaveLength(1));
    await act(async () => appStateListener?.('active'));
    await act(async () => appStateListener?.('active'));
    expect(refreshCalls()).toHaveLength(1);
  });
});
