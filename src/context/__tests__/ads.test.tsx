import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { gatherConsent, initializeAds, showPrivacyOptions } from '@/ads/consent';
import { flushImpressions } from '@/ads/impressions';
import { AdsProvider, useAds } from '../ads';

jest.mock('@/ads/config', () => ({ ADS_SUPPORTED: true }));
jest.mock('@/ads/consent', () => ({ gatherConsent: jest.fn(), initializeAds: jest.fn(), showPrivacyOptions: jest.fn() }));
jest.mock('@/ads/impressions', () => ({ flushImpressions: jest.fn().mockResolvedValue(undefined) }));
let mockToken: string | null = 'tok';
jest.mock('@/context/session', () => ({ useSession: () => ({ auth: mockToken ? { token: mockToken } : null }) }));
const mockGetAccount = jest.fn();
jest.mock('@/services/me-api', () => ({
  ...jest.requireActual('@/services/me-api'),
  getAccount: (...args: unknown[]) => mockGetAccount(...args),
}));

const wrapper = ({ children }: { children: ReactNode }) => <AdsProvider>{children}</AdsProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  mockToken = 'tok';
  mockGetAccount.mockResolvedValue({ adFree: false, vipUntil: null });
});

describe('AdsProvider', () => {
  it('starts the SDK only once consent allows ads, and exposes Privacy options when required', async () => {
    (gatherConsent as jest.Mock).mockResolvedValue({ canRequestAds: true, privacyOptionsRequired: true });
    const { result } = renderHook(() => useAds(), { wrapper });
    await waitFor(() => expect(result.current.privacyOptionsRequired).toBe(true));
    expect(initializeAds).toHaveBeenCalledTimes(1);
  });

  it('never starts the SDK without consent', async () => {
    (gatherConsent as jest.Mock).mockResolvedValue({ canRequestAds: false, privacyOptionsRequired: true });
    const { result } = renderHook(() => useAds(), { wrapper });
    await waitFor(() => expect(result.current.privacyOptionsRequired).toBe(true));
    expect(result.current.canRequestAds).toBe(false);
    expect(initializeAds).not.toHaveBeenCalled();
  });

  it('applies a new choice made in Privacy options', async () => {
    (gatherConsent as jest.Mock).mockResolvedValue({ canRequestAds: false, privacyOptionsRequired: true });
    (showPrivacyOptions as jest.Mock).mockResolvedValue({ canRequestAds: true, privacyOptionsRequired: true });
    const { result } = renderHook(() => useAds(), { wrapper });
    await waitFor(() => expect(gatherConsent).toHaveBeenCalled());
    await act(() => result.current.openPrivacyOptions());
    expect(result.current.canRequestAds).toBe(true);
    expect(initializeAds).toHaveBeenCalledTimes(1);
  });

  it('sends the queued impressions with the session token, and not without one', async () => {
    (gatherConsent as jest.Mock).mockResolvedValue({ canRequestAds: false, privacyOptionsRequired: false });
    renderHook(() => useAds(), { wrapper });
    await waitFor(() => expect(flushImpressions).toHaveBeenCalledWith('tok'));
    jest.clearAllMocks();
    mockToken = null;
    renderHook(() => useAds(), { wrapper });
    await act(async () => {});
    expect(flushImpressions).not.toHaveBeenCalled();
  });

  describe('interstitials', () => {
    const allowedFor = async (account: object | Error) => {
      (gatherConsent as jest.Mock).mockResolvedValue({ canRequestAds: true, privacyOptionsRequired: false });
      if (account instanceof Error) mockGetAccount.mockRejectedValue(account);
      else mockGetAccount.mockResolvedValue(account);
      const { result } = renderHook(() => useAds(), { wrapper });
      await waitFor(() => expect(result.current.canRequestAds).toBe(true));
      await act(async () => {});
      return result.current.interstitialsAllowed;
    };

    it('are allowed for a normal account with consent', async () => {
      expect(await allowedFor({ adFree: false, vipUntil: null })).toBe(true);
    });

    it('are never shown to ad-free or VIP accounts', async () => {
      expect(await allowedFor({ adFree: true, vipUntil: null })).toBe(false);
      expect(await allowedFor({ vipUntil: new Date(Date.now() + 86_400_000).toISOString() })).toBe(false);
      expect(await allowedFor({ vipUntil: new Date(Date.now() - 1000).toISOString() })).toBe(true); // VIP ended
    });

    it('are not shown while the account is unknown (e.g. offline)', async () => {
      expect(await allowedFor(new Error('offline'))).toBe(false);
    });
  });
});
