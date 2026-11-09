import { render, screen, waitFor } from '@testing-library/react-native';

import { CollectRing } from '../home/collect-ring';
import { DailyTasksCard, LeagueMiniCard, StepsMiniCard, TodayStrip } from '../home/home-cards';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@/i18n', () => ({ useI18n: () => ({ language: 'tr', t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }) }));
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok' } }) }));
let mockSteps: any;
jest.mock('@/context/steps', () => ({ useSteps: () => mockSteps }));
let mockSnapshot: any;
jest.mock('@/services/league-cache', () => ({ useLeagueSnapshot: () => mockSnapshot }));
const mockGetTasks = jest.fn();
jest.mock('@/services/tasks-api', () => ({ getTasks: (...a: unknown[]) => mockGetTasks(...a) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockSteps = { availability: 'ready', steps: 2100, todaySteps: 6240, bonusClbPerHour: 0.01 };
  mockSnapshot = null;
});

describe('TodayStrip', () => {
  it('shows what was collected today in gold, and hides without the server’s figure', () => {
    render(<TodayStrip collectedToday={1.84} />);
    expect(screen.getByText('Bugün toplanan')).toBeTruthy();
    expect(screen.getByText('+1,84 Wago')).toBeTruthy();
    expect(render(<TodayStrip collectedToday={undefined} />).toJSON()).toBeNull();
    expect(render(<TodayStrip collectedToday={null} />).toJSON()).toBeNull();
    // A new day starts from zero and still shows.
    render(<TodayStrip collectedToday={0} />);
    expect(screen.getByText('+0,00 Wago')).toBeTruthy();
  });
});

describe('StepsMiniCard', () => {
  it('shows today’s steps and what the session’s steps add', () => {
    render(<StepsMiniCard />);
    expect(screen.getByText('6.240 adım · bugün')).toBeTruthy();
    expect(screen.getByText('Oturumda 2.100 adım\n+0,01 Wago/saat')).toBeTruthy();
  });

  it('asks to connect when steps aren’t available', () => {
    mockSteps = { availability: 'denied', steps: 0, todaySteps: null, bonusClbPerHour: 0 };
    render(<StepsMiniCard />);
    expect(screen.getByText('Adımlarını bağla')).toBeTruthy();
  });
});

describe('LeagueMiniCard', () => {
  it('shows the league, the rank and the places to promotion', () => {
    mockSnapshot = { inLeague: true, weekEnd: null, savedAt: 0, state: 'active', league: 0, rank: 12, promoteCount: 9, entryRequired: 30 };
    render(<LeagueMiniCard balance={40} />);
    expect(screen.getByText('Bronz Lig')).toBeTruthy();
    expect(screen.getByText('12. sıra')).toBeTruthy();
    expect(screen.getByText(/^Terfi için 3 sıra · Pzt \d\d:\d\d$/)).toBeTruthy();
  });

  it('says how much is left to join', () => {
    mockSnapshot = { inLeague: false, weekEnd: null, savedAt: 0, state: 'locked', league: 0, rank: null, entryRequired: 30 };
    render(<LeagueMiniCard balance={12.5} />);
    expect(screen.getByText('Lige 17,50 Wago kaldı')).toBeTruthy();
  });
});

describe('DailyTasksCard', () => {
  it('shows done/total and the next task', async () => {
    mockGetTasks.mockResolvedValue({
      tasks: [
        { id: 'mine', reward: 0.05, progress: 1, target: 1, isComplete: true, claimed: true },
        { id: 'friend', reward: 0.1, progress: 1, target: 1, isComplete: true, claimed: false },
        { id: 'steps', reward: 0.12, progress: 1000, target: 5000, isComplete: false, claimed: false },
      ],
    });
    render(<DailyTasksCard />);
    await waitFor(() => expect(screen.getByText('Günlük görevler 2/3')).toBeTruthy());
    expect(screen.getByText('Kalan: 5.000 adım at · +0,12 Wago')).toBeTruthy();
  });

  it('stays hidden until tasks arrive', () => {
    mockGetTasks.mockReturnValue(new Promise(() => {}));
    expect(render(<DailyTasksCard />).toJSON()).toBeNull();
  });
});

describe('CollectRing', () => {
  const props = { progress: 0.4, rate: '0,13 Wago/saat', busy: false, disabled: false, onStart: jest.fn() };

  it('shows "Toplanıyor" and the speed with a gold tip while collecting', () => {
    render(<CollectRing {...props} collecting animate={false} />);
    expect(screen.getByText('Toplanıyor')).toBeTruthy();
    expect(screen.getByText('0,13 Wago/saat')).toBeTruthy();
    expect(screen.getByTestId('ring-tip')).toBeTruthy();
    expect(screen.getByTestId('ring-progress')).toBeTruthy();
  });

  it('shows a start button when not collecting, with no tip', () => {
    render(<CollectRing {...props} collecting={false} animate={false} />);
    expect(screen.getByLabelText('Toplamayı başlat')).toBeTruthy();
    expect(screen.queryByTestId('ring-tip')).toBeNull();
    expect(screen.queryByTestId('ring-progress')).toBeNull();
  });
});
