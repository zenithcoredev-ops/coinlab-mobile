import { act, renderHook } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { MIDNIGHT_REFRESH_DELAY_MS, MiningProvider, useMining } from '../mining';

jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok' } }) }));
const mockGetStatus = jest.fn();
jest.mock('@/services/mining-api', () => ({
  getMiningStatus: (...a: unknown[]) => mockGetStatus(...a),
  startMining: jest.fn(),
}));

const idle = (over = {}) => ({ serverTime: new Date().toISOString(), balance: '1', session: null, collectedToday: 0.5, ...over });
const wrapper = ({ children }: { children: ReactNode }) => <MiningProvider>{children}</MiningProvider>;
const flush = () => act(async () => {});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 2, 11, 23, 59, 0));
  mockGetStatus.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('MiningProvider at local midnight', () => {
  it('refreshes the status once just after midnight', async () => {
    mockGetStatus.mockImplementation(async () => idle());
    renderHook(() => useMining(), { wrapper });
    await flush();
    expect(mockGetStatus).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTime(60_000 - 1000));
    expect(mockGetStatus).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTime(1000 + MIDNIGHT_REFRESH_DELAY_MS));
    await flush();
    expect(mockGetStatus).toHaveBeenCalledTimes(2);

    // Not again until the next midnight.
    await act(async () => jest.advanceTimersByTime(60 * 60_000));
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  it('doesn’t when the server doesn’t send "collected today"', async () => {
    mockGetStatus.mockImplementation(async () => idle({ collectedToday: undefined }));
    renderHook(() => useMining(), { wrapper });
    await flush();
    await act(async () => jest.advanceTimersByTime(2 * 60_000 + MIDNIGHT_REFRESH_DELAY_MS));
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });
});
