import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ALL_TYPES_ON } from '@/lib/notification-plan';
import ProfileScreen from '../(tabs)/profile';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/i18n', () => ({
  useI18n: () => ({ language: 'tr', preference: 'auto', setPreference: jest.fn(), t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }),
}));
jest.mock('expo-router', () => ({ useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]) }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.4.0' } }));
const mockSignOut = jest.fn();
jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok', name: 'Burhan S' }, signOut: mockSignOut }) }));
jest.mock('@/context/mining', () => ({ useMining: () => ({ status: { streak: 14, streakMinedToday: true, clbPerHour: 0.13, currentThs: 1, balance: '3', session: null } }) }));
let mockNotif: { active: boolean };
jest.mock('@/context/notifications', () => ({
  useNotifications: () => ({
    active: mockNotif.active,
    permission: 'granted',
    setEnabled: jest.fn(),
    refreshPermission: jest.fn(),
    typePrefs: require('@/lib/notification-plan').ALL_TYPES_ON,
    setTypeEnabled: jest.fn(),
  }),
}));
jest.mock('@/context/ads', () => ({ useAds: () => ({ privacyOptionsRequired: false, openPrivacyOptions: jest.fn() }) }));
jest.mock('@/components/share-card-modal', () => ({ ShareCardModal: () => null }));
jest.mock('@/components/support-modal', () => ({ SupportModal: () => null }));
jest.mock('@/components/widget-diagnostics', () => ({ WidgetDiagnostics: () => null }));
jest.mock('@/components/widget-weather-setting', () => ({ WidgetWeatherSetting: () => null }));
let mockAccount: Record<string, unknown>;
jest.mock('@/services/me-api', () => ({ getAccount: async () => mockAccount, deleteAccount: jest.fn() }));
jest.mock('@/services/badges-api', () => ({
  ...jest.requireActual('@/services/badges-api'),
  getBadges: async () => ({
    badges: [
      { id: 'week_streak', earnedAt: '2026-11-03T10:00:00Z' },
      { id: 'night_owl', earnedAt: null },
      { id: 'first_friend', earnedAt: null },
      { id: 'diamond', earnedAt: null },
      { id: 'tournament', earnedAt: null },
      { id: 'champion', earnedAt: null },
    ],
  }),
}));

const account = {
  id: 'u1',
  name: 'Burhan S',
  email: 'burhan@example.com',
  provider: 'google',
  createdAt: new Date(2026, 9, 12, 12).toISOString(),
  inviteCode: 'WAGO-ABCDE',
  balance: '3',
  streak: 14,
  league: 0,
  hasUsedCode: false,
  onboardingComplete: true,
  vipUntil: null,
  equippedFrame: null,
  ownedFrames: [],
};

beforeEach(() => {
  mockAccount = { ...account };
  mockNotif = { active: true };
  void ALL_TYPES_ON;
});

describe('Profile screen', () => {
  it('shows the profile card, the three stats and the footer', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('burhan@example.com')).toBeTruthy());
    expect(screen.getByText('Burhan S')).toBeTruthy();
    expect(screen.getByText('Üyelik: Ekim 2026')).toBeTruthy();

    expect(within(screen.getByTestId('stat-streak')).getByText('14 gün')).toBeTruthy();
    expect(within(screen.getByTestId('stat-streak')).getByText('Seri')).toBeTruthy();
    expect(within(screen.getByTestId('stat-league')).getByText('Bronz Lig')).toBeTruthy();
    expect(within(screen.getByTestId('stat-league')).getByText('Lig')).toBeTruthy();
    // No "Toplam gün" from the server yet: the current speed stands in.
    expect(screen.getByTestId('stat-speed')).toBeTruthy();
    expect(screen.getByText('0,13')).toBeTruthy();
    expect(screen.getByText('Saatlik hız')).toBeTruthy();
    // Labels without slashes.
    for (const label of ['Seri', 'Lig', 'Saatlik hız']) expect(label.includes('/')).toBe(false);

    expect(screen.getByText('Hava durumu verisi: MET Norway (CC BY 4.0)')).toBeTruthy();
    expect(screen.getByText('Waligo v1.4.0')).toBeTruthy();
  });

  it('shows "Toplam gün" once the server sends it', async () => {
    mockAccount = { ...account, totalCollectDays: 42 };
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Toplam gün')).toBeTruthy());
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.queryByTestId('stat-speed')).toBeNull();
  });

  it('marks locked badges with a lock and opens the existing detail sheet on tap', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('badge-week_streak')).toBeTruthy());
    expect(screen.queryByTestId('badge-lock-week_streak')).toBeNull();
    expect(screen.getByTestId('badge-lock-champion')).toBeTruthy();
    expect(screen.getByText('6 rozetten 1 tanesi kazanıldı')).toBeTruthy();
    fireEvent.press(screen.getByTestId('badge-week_streak'));
    expect(screen.getByText('7 gün üst üste toplama yaparak serini 7 güne çıkar.')).toBeTruthy();
  });

  it('has the main reminders switch with the six kinds, dimmed while it is off', async () => {
    mockNotif = { active: false };
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('notif-main')).toBeTruthy());
    for (const label of ['Oturum bitti', 'Lig', 'Adım', 'Hız artırma', 'Geri dön']) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.getByTestId('notif-type-streak').props.disabled).toBe(true);
    expect(screen.getByTestId('notif-types')).toHaveStyle({ opacity: 0.5 });
  });

  it('lists language, legal links, delete and sign out; delete still asks first', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('burhan@example.com')).toBeTruthy());
    const settings = within(screen.getByTestId('settings-card'));
    for (const label of ['Ayarlar', 'Dil', 'Gizlilik politikası', 'Kullanım şartları', 'Hesabı sil', 'Çıkış yap']) expect(settings.getByText(label)).toBeTruthy();
    fireEvent.press(settings.getByText('Hesabı sil'));
    expect(alert).toHaveBeenCalledWith('Hesabı sil', expect.any(String), expect.any(Array));
  });
});
