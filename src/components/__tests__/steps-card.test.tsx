import { render, screen } from '@testing-library/react-native';

import { StepsCard } from '../steps-card';

let mockLanguage: 'tr' | 'en' = 'tr';
jest.mock('@/i18n', () => ({
  useI18n: () => ({ language: mockLanguage, t: (k: string, p?: object) => require('@/i18n/translate').translate(mockLanguage, k, p) }),
}));
let mockSteps: Record<string, unknown>;
jest.mock('@/context/steps', () => ({ useSteps: () => mockSteps }));
let mockStatus: unknown;
jest.mock('@/context/mining', () => ({ useMining: () => ({ status: mockStatus }) }));

const session = { id: 's', startedAt: 'S', endsAt: 'E', adBoosts: 0, remainingMs: 1, accruedClb: 0 };
const steps = (over = {}) => ({
  availability: 'ready',
  steps: 1240,
  todaySteps: 16_048,
  bonusClbPerHour: 0.01,
  syncFailed: false,
  backgroundAccess: true,
  allowBackground: jest.fn(),
  connect: jest.fn(),
  openStore: jest.fn(),
  ...over,
});

beforeEach(() => {
  mockLanguage = 'tr';
  mockSteps = steps();
  mockStatus = { session };
});

describe('StepsCard', () => {
  it('names the session count, shows today’s Health Connect total under it and explains the bonus', () => {
    render(<StepsCard />);
    expect(screen.getByText('Bu oturumdaki adımlar: 1.240 / 10.000')).toBeTruthy();
    expect(screen.getByText('Bugün toplam: 16.048 adım')).toBeTruthy();
    expect(screen.getByText('Hız bonusu, toplama oturumu başladıktan sonra atılan adımlardan hesaplanır.')).toBeTruthy();
    expect(screen.getByText(/^Hız bonusu: \+0,01 Wago\/saat/)).toBeTruthy();
  });

  it('without a session says to start collecting first', () => {
    mockSteps = steps({ steps: 0 });
    mockStatus = { session: null };
    render(<StepsCard />);
    expect(screen.getByText('Bu oturumdaki adımlar: 0 / 10.000')).toBeTruthy();
    expect(screen.getByText('Bugün toplam: 16.048 adım')).toBeTruthy();
    expect(screen.getByText('Adım bonusu için önce toplamayı başlat.')).toBeTruthy();
    expect(screen.queryByText(/^Hız bonusu: /)).toBeNull();
  });

  it('leaves out today’s total until Health Connect has given one', () => {
    mockSteps = steps({ todaySteps: null });
    render(<StepsCard />);
    expect(screen.queryByText(/^Bugün toplam/)).toBeNull();
  });

  it('in English', () => {
    mockLanguage = 'en';
    render(<StepsCard />);
    expect(screen.getByText('Steps this session: 1,240 / 10,000')).toBeTruthy();
    expect(screen.getByText('Today’s total: 16,048 steps')).toBeTruthy();
    expect(screen.getByText('The speed bonus counts the steps you take after your collecting session starts.')).toBeTruthy();
  });
});
