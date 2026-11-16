import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import FriendsScreen from '../(tabs)/friends';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/i18n', () => ({ useI18n: () => ({ language: 'tr', t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }) }));
jest.mock('expo-router', () => ({ useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]) }));
const mockCopy = jest.fn().mockResolvedValue(true);
jest.mock('expo-clipboard', () => ({ setStringAsync: (...a: unknown[]) => mockCopy(...a) }));
jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok' } }) }));
jest.mock('@/context/mining', () => ({ useMining: () => ({ status: { streak: 2, streakMinedToday: true, session: null }, refresh: jest.fn() }) }));
let mockOverview: any;
const mockSubmit = jest.fn();
jest.mock('@/services/friends-api', () => ({
  ...jest.requireActual('@/services/friends-api'),
  getFriends: async () => mockOverview,
  submitInviteCode: (...a: unknown[]) => mockSubmit(...a),
}));

const overview = (over = {}) => ({
  inviteCode: 'WAGO-7K2QX',
  invitedCount: 3,
  activeCount: 2,
  bonusPerFriendThs: 1,
  bonusPerFriendClbPerHour: 0.2,
  totalBonusThs: 2,
  totalBonusClbPerHour: 0.4,
  welcomeBonusClb: 25,
  hasUsedCode: false,
  friends: [
    { id: 'a', name: 'Ayşe', active: true, bonusThs: 1, bonusClbPerHour: 0.2 },
    { id: 'b', name: 'Mert', active: false, bonusThs: 0, bonusClbPerHour: 0 },
  ],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockOverview = overview();
});

describe('Friends screen (neon)', () => {
  it('shows the title, the invite card with the code, gold amounts and the share button inside it', async () => {
    render(<FriendsScreen />);
    await waitFor(() => expect(screen.getByText('WAGO-7K2QX')).toBeTruthy());
    expect(screen.getByText('Arkadaşlar')).toBeTruthy();
    expect(screen.getByText('Birlikte yürüyün, birlikte hızlanın.')).toBeTruthy();
    const invite = within(screen.getByTestId('invite-card'));
    expect(invite.getByText('Davet kodun')).toBeTruthy();
    expect(invite.getByText('+0,20 Wago/saat')).toBeTruthy();
    expect(invite.getByText('+25 Wago')).toBeTruthy();
    expect(invite.getByText('Daveti paylaş')).toBeTruthy();
  });

  it('copies the code and says so for 2 seconds', async () => {
    jest.useFakeTimers();
    try {
      render(<FriendsScreen />);
      await act(async () => {});
      await act(async () => fireEvent.press(screen.getByText('Kopyala')));
      expect(mockCopy).toHaveBeenCalledWith('WAGO-7K2QX');
      expect(screen.getByText('Kopyalandı ✓')).toBeTruthy();
      await act(async () => jest.advanceTimersByTime(2000));
      expect(screen.getByText('Kopyala')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows three equal stat cards, the bonus in gold', async () => {
    render(<FriendsScreen />);
    await waitFor(() => expect(screen.getByTestId('stat-bonus')).toBeTruthy());
    expect(within(screen.getByTestId('stat-invited')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('stat-active')).getByText('2')).toBeTruthy();
    expect(within(screen.getByTestId('stat-bonus')).getByText('+0,40')).toBeTruthy();
    expect(within(screen.getByTestId('stat-bonus')).getByText('Bonus Wago/saat')).toBeTruthy();
  });

  it('lists the team with only a status chip each, and the empty state when there is no one', async () => {
    const view = render(<FriendsScreen />);
    await waitFor(() => expect(screen.getByText('Ayşe')).toBeTruthy());
    const team = within(screen.getByTestId('team-card'));
    expect(team.getByText('Aktif')).toBeTruthy();
    expect(team.getByText('Pasif')).toBeTruthy();
    expect(team.queryByText(/Wago/)).toBeNull();
    view.unmount();

    mockOverview = overview({ friends: [], invitedCount: 0, activeCount: 0 });
    render(<FriendsScreen />);
    await waitFor(() => expect(screen.getByText('Henüz davet yok')).toBeTruthy());
  });

  it('applies a friend’s code with the same checks as before', async () => {
    render(<FriendsScreen />);
    await waitFor(() => expect(screen.getByTestId('enter-card')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText('WAGO-XXXXX'), 'nope');
    await act(async () => fireEvent.press(screen.getByText('Uygula')));
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Bu kod doğru görünmüyor. Arkadaşının paylaştığı kodu olduğu gibi gir.')).toBeTruthy();

    mockSubmit.mockResolvedValue({ ok: true, bonusClb: 25 });
    fireEvent.changeText(screen.getByPlaceholderText('WAGO-XXXXX'), 'wago-abcde');
    await act(async () => fireEvent.press(screen.getByText('Uygula')));
    expect(mockSubmit).toHaveBeenCalledWith('tok', 'WAGO-ABCDE');
  });
});
