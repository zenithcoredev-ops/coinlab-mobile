import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TasksScreen from '../(tabs)/tasks';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/i18n', () => ({ useI18n: () => ({ language: 'tr', t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }) }));
jest.mock('expo-router', () => ({ useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]) }));
jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok' } }) }));
jest.mock('@/context/mining', () => ({
  useMining: () => ({ status: { streak: 3, streakMinedToday: true, streakExpiresAt: null, session: null }, refresh: jest.fn() }),
}));
jest.mock('@/context/steps', () => ({
  useSteps: () => ({ availability: 'ready', steps: 1240, todaySteps: 6240, bonusClbPerHour: 0, backgroundAccess: true, syncFailed: false }),
}));
const mockGetTasks = jest.fn();
const mockClaim = jest.fn();
jest.mock('@/services/tasks-api', () => ({
  ...jest.requireActual('@/services/tasks-api'),
  getTasks: (...a: unknown[]) => mockGetTasks(...a),
  claimTask: (...a: unknown[]) => mockClaim(...a),
}));

const task = (id: string, over = {}) => ({ id, reward: 0.1, progress: 0, target: 1, isComplete: false, claimed: false, ...over });
const progress = {
  serverTime: '2026-03-11T18:47:20Z',
  day: '2026-03-11',
  resetsAt: '2026-03-12T00:00:00Z',
  earnedToday: 0.35,
  tasks: [
    task('mine', { progress: 1, isComplete: true, claimed: true }),
    task('friend', { progress: 1, isComplete: true }),
    task('steps', { target: 5000, progress: 1240, reward: 0.12 }),
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTasks.mockResolvedValue(progress);
  mockClaim.mockResolvedValue({ ok: true, reward: 0.1, balance: '1' });
});

describe('Tasks screen', () => {
  it('shows the title, the local reset note, the countdown and today’s total', async () => {
    render(<TasksScreen />);
    await waitFor(() => expect(screen.getByText('Sıfırlanmaya')).toBeTruthy());
    expect(screen.getByText('Günlük görevler')).toBeTruthy();
    expect(screen.getByText('Her gün gece yarısı (yerel saat) sıfırlanır.')).toBeTruthy();
    expect(screen.getByText(/^05:12:\d\d$/)).toBeTruthy();
    expect(screen.getByText('Bugün kazanılan')).toBeTruthy();
    expect(screen.getByText('0,35')).toBeTruthy();
    expect(screen.getByLabelText('Bu oturumdaki adımlar: 1.240 / 10.000')).toBeTruthy();
    // The tab's picture, tinted green under its shade.
    expect(screen.getByTestId('background-image')).toBeTruthy();
    expect(screen.getByTestId('background-tint')).toBeTruthy();
  });

  it('shows done, ready and locked tasks, and claims the ready one', async () => {
    render(<TasksScreen />);
    await waitFor(() => expect(screen.getByText('Alındı ✓')).toBeTruthy());
    // Done is a label, not a button.
    expect(screen.queryByRole('button', { name: 'Alındı ✓' })).toBeNull();
    expect(screen.getByText('5.000 adıma ulaşınca')).toBeTruthy();
    expect(screen.getByText('+0,12 Wago  ·  1.240 / 5.000')).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByText('Al')));
    expect(mockClaim).toHaveBeenCalledWith('tok', 'friend');
    expect(screen.getByText('Bakiyene +0,10 Wago eklendi')).toBeTruthy();
  });
});
