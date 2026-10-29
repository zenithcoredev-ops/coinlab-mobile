import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useTimezoneSync } from '../use-timezone-sync';

const mockUpdate = jest.fn();
const mockRefresh = jest.fn();
let mockStatus: { timezone?: string | null } | null = null;

jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok' } }) }));
jest.mock('@/context/mining', () => ({ useMining: () => ({ status: mockStatus, refresh: mockRefresh }) }));
jest.mock('@/services/me-api', () => ({ updateTimeZone: (...args: unknown[]) => mockUpdate(...args) }));
jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: 'Europe/Istanbul' }] }));

let appStateListener: ((state: string) => void) | null = null;
beforeEach(() => {
  mockUpdate.mockReset().mockResolvedValue({ ok: true });
  mockRefresh.mockReset().mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
});

describe('useTimezoneSync', () => {
  it('sends the device zone when the server has none, then refreshes the status', async () => {
    mockStatus = { timezone: null };
    renderHook(() => useTimezoneSync());
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalledWith('tok', 'Europe/Istanbul');
  });

  it('tries once per return to the app, even if the server still disagrees', async () => {
    mockStatus = { timezone: 'America/New_York' };
    const { rerender } = renderHook(() => useTimezoneSync());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    rerender({});
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    act(() => appStateListener?.('active'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  });

  it('leaves a matching zone and older servers alone', () => {
    mockStatus = { timezone: 'Europe/Istanbul' };
    renderHook(() => useTimezoneSync());
    mockStatus = {};
    renderHook(() => useTimezoneSync());
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
