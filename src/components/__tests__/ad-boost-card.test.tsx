import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { runRewardedBoost } from '@/ads/rewarded';
import { AdBoostCard } from '../ad-boost-card';

jest.mock('@/ads/config', () => ({ ADS_SUPPORTED: true, adUnitId: () => 'unit-rw' }));
jest.mock('@/ads/rewarded', () => ({ runRewardedBoost: jest.fn() }));
jest.mock('@/i18n', () => ({ useI18n: () => ({ t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }) }));
jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok' } }) }));
let mockConsent = true;
jest.mock('@/context/ads', () => ({ useAds: () => ({ canRequestAds: mockConsent }) }));
const mockRefresh = jest.fn();
let mockStatus: any;
jest.mock('@/context/mining', () => ({ useMining: () => ({ status: mockStatus, refresh: mockRefresh }) }));

const session = { id: 's', startedAt: '', endsAt: '', adBoosts: 0, remainingMs: 1, accruedClb: 0 };
const ads = (over = {}) => ({ usedToday: 1, dailyLimit: 3, nextAllowedAt: null, activeBoosts: 1, ...over });
const run = runRewardedBoost as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockConsent = true;
  mockStatus = { session, ads: ads() };
});

describe('AdBoostCard', () => {
  it('shows today’s use and active boosts while mining', () => {
    render(<AdBoostCard />);
    expect(screen.getByText('Bugün: 1 / 3')).toBeTruthy();
    expect(screen.getByText('1 takviye aktif')).toBeTruthy();
    expect(screen.getByText('Reklam izle')).toBeTruthy();
  });

  it('is hidden without the server’s rewarded data, without a session, or without ad consent', () => {
    mockStatus = { session, ads: undefined };
    expect(render(<AdBoostCard />).toJSON()).toBeNull();
    mockStatus = { session: null, ads: ads() };
    expect(render(<AdBoostCard />).toJSON()).toBeNull();
    mockStatus = { session, ads: ads() };
    mockConsent = false;
    expect(render(<AdBoostCard />).toJSON()).toBeNull();
  });

  it('cannot be used past the daily limit or before the next allowed time', () => {
    mockStatus = { session, ads: ads({ usedToday: 3 }) };
    render(<AdBoostCard />);
    expect(screen.getByText('Bugünkü takviyelerini kullandın.')).toBeTruthy();
    fireEvent.press(screen.getByText('Reklam izle'));
    expect(run).not.toHaveBeenCalled();

    mockStatus = { session, ads: ads({ nextAllowedAt: new Date(Date.now() + 5 * 60_000).toISOString() }) };
    render(<AdBoostCard />);
    expect(screen.getByText(/^Sonraki: 00:0[45]:\d\d sonra$/)).toBeTruthy();
  });

  it('says the boost is on only after the server granted it, then refreshes the status', async () => {
    let finish!: (o: string) => void;
    run.mockImplementation((_t: string, _u: string, { onVerifying }: { onVerifying: () => void }) => {
      onVerifying();
      return new Promise((resolve) => (finish = resolve));
    });
    render(<AdBoostCard />);
    await act(async () => {
      fireEvent.press(screen.getByText('Reklam izle'));
    });
    expect(screen.getByText('Ödül doğrulanıyor…')).toBeTruthy();
    expect(screen.queryByText('Hız takviyen eklendi.')).toBeNull();
    await act(async () => finish('granted'));
    expect(screen.getByText('Hız takviyen eklendi.')).toBeTruthy();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('tells the user when it is still being confirmed, and says nothing when the ad was closed', async () => {
    run.mockResolvedValue('pending');
    render(<AdBoostCard />);
    await act(async () => fireEvent.press(screen.getByText('Reklam izle')));
    expect(screen.getByText('Takviyen birkaç dakika içinde eklenecek.')).toBeTruthy();

    run.mockResolvedValue('dismissed');
    await act(async () => fireEvent.press(screen.getByText('Reklam izle')));
    expect(screen.queryByText('Takviyen birkaç dakika içinde eklenecek.')).toBeNull();
  });

  it('hides itself for good when the server has no rewarded endpoints (404)', async () => {
    run.mockResolvedValue('unavailable');
    const view = render(<AdBoostCard />);
    await act(async () => fireEvent.press(screen.getByText('Reklam izle')));
    expect(view.toJSON()).toBeNull();
  });
});
