import { act, renderHook } from '@testing-library/react-native';

import { preloadMiningStartAd, showMiningStartAdIfReady } from '@/ads/interstitial';
import { useStartMining } from '../use-start-mining';

const mockStart = jest.fn();
let mockAllowed = true;
jest.mock('@/context/mining', () => ({ useMining: () => ({ start: mockStart }) }));
jest.mock('@/context/ads', () => ({ useAds: () => ({ interstitialsAllowed: mockAllowed }) }));
jest.mock('@/ads/interstitial', () => ({ preloadMiningStartAd: jest.fn(), showMiningStartAdIfReady: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAllowed = true;
});

describe('useStartMining', () => {
  it('sends the start request first and shows the ad only after mining has started', async () => {
    let finish!: (ok: boolean) => void;
    mockStart.mockReturnValue(new Promise<boolean>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useStartMining(true));
    let done!: Promise<void>;
    act(() => {
      done = result.current();
    });
    expect(mockStart).toHaveBeenCalledTimes(1); // sent right away
    expect(showMiningStartAdIfReady).not.toHaveBeenCalled();
    await act(async () => {
      finish(true);
      await done;
    });
    expect(showMiningStartAdIfReady).toHaveBeenCalledTimes(1);
  });

  it('shows no ad when the start failed', async () => {
    mockStart.mockResolvedValue(false);
    const { result } = renderHook(() => useStartMining(true));
    await act(() => result.current());
    expect(showMiningStartAdIfReady).not.toHaveBeenCalled();
  });

  it('never loads or shows an ad without consent or for ad-free/VIP accounts, and still starts', async () => {
    mockAllowed = false;
    mockStart.mockResolvedValue(true);
    const { result } = renderHook(() => useStartMining(true));
    await act(() => result.current());
    expect(mockStart).toHaveBeenCalled();
    expect(preloadMiningStartAd).not.toHaveBeenCalled();
    expect(showMiningStartAdIfReady).not.toHaveBeenCalled();
  });

  it('preloads only while idle (no session running)', () => {
    renderHook(() => useStartMining(false));
    expect(preloadMiningStartAd).not.toHaveBeenCalled();
    renderHook(() => useStartMining(true));
    expect(preloadMiningStartAd).toHaveBeenCalledTimes(1);
  });
});
