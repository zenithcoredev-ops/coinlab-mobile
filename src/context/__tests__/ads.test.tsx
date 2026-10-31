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

const wrapper = ({ children }: { children: ReactNode }) => <AdsProvider>{children}</AdsProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  mockToken = 'tok';
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
});
