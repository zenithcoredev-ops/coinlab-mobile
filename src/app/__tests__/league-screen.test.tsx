import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LeagueScreen from '../(tabs)/league';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/i18n', () => ({ useI18n: () => ({ language: 'tr', t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }) }));
jest.mock('expo-router', () => ({ useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]) }));
jest.mock('@/context/session', () => ({ useSession: () => ({ auth: { token: 'tok' } }) }));
jest.mock('@/context/mining', () => ({ useMining: () => ({ status: null, refresh: jest.fn() }) }));
jest.mock('@/hooks/use-live-balance', () => ({ useLiveBalance: () => null }));
jest.mock('@/components/share-card-modal', () => ({ ShareCardModal: () => null }));
const mockGetLeague = jest.fn();
jest.mock('@/services/league-api', () => ({ ...jest.requireActual('@/services/league-api'), getLeague: () => mockGetLeague() }));

// The shape production's GET /league sends (coinlab-backend getLeagueView), with a group big enough
// to have a promotion band: this is what closed the app.
const base = {
  serverTime: '2026-11-09T20:00:00.000Z',
  league: 0,
  speedBonus: 0,
  speedBonusClbPerHour: 0,
  entry: { required: 30, balance: 41.2 },
  lastResult: null,
  tournamentResult: null,
  tournamentRewards: [
    { rank: 1, clb: 500, vipDays: 30, frame: 'champion' },
    { rank: 2, clb: 250, vipDays: 14, frame: 'runner_up' },
    { rank: 3, clb: 100, vipDays: 7, frame: 'third_place' },
  ],
};
const standings = Array.from({ length: 12 }, (_, i) => ({
  rank: i + 1,
  name: i === 4 ? 'Waligo' : `P${i + 1}`,
  frame: null,
  points: 12 - i,
  isYou: i === 4,
  zone: i < 3 ? 'promote' : null,
}));
const active = {
  ...base,
  state: 'active',
  weekStart: '2026-11-09T00:00:00.000Z',
  weekEnd: '2026-11-16T00:00:00.000Z',
  groupSize: 12,
  bands: { promoteCount: 3, demoteCount: 0, tournamentCount: 0 },
  nextSpeedBonus: 0.5,
  nextSpeedBonusClbPerHour: 0.01,
  yourRank: 5,
  yourPoints: 8,
  standings,
};

beforeEach(() => mockGetLeague.mockReset());

describe('League screen with production data', () => {
  it('draws an active league with a promotion band (this used to throw and close the app)', async () => {
    mockGetLeague.mockResolvedValue(active);
    render(<LeagueScreen />);
    await waitFor(() => expect(screen.getByText('Terfi: 12 kişiden ilk 3')).toBeTruthy());
    expect(screen.getByText('Bronz Lig')).toBeTruthy();
    expect(screen.getByText('P1')).toBeTruthy();
  });

  it('draws the Diamond league', async () => {
    mockGetLeague.mockResolvedValue({ ...active, league: 9, bands: { promoteCount: 0, demoteCount: 2, tournamentCount: 2 } });
    render(<LeagueScreen />);
    await waitFor(() => expect(screen.getByText("Bu haftanın ilk 2 kişisi Elmas Turnuvası'na girer")).toBeTruthy());
    expect(screen.getByText('Elmas Lig')).toBeTruthy();
  });

  it('draws a live tournament stage', async () => {
    mockGetLeague.mockResolvedValue({
      ...base,
      league: 9,
      state: 'tournament',
      tournament: {
        pending: false,
        stage: 'qf',
        stageNumber: 1,
        stageCount: 3,
        weekEnd: '2026-11-16T00:00:00.000Z',
        size: 8,
        advanceCount: 4,
        yourRank: 2,
        yourPoints: 3,
        standings: standings.slice(0, 8).map((s) => ({ ...s, zone: s.rank <= 4 ? 'promote' : 'demote' })),
      },
    });
    render(<LeagueScreen />);
    await waitFor(() => expect(screen.getByText('8 kişiden ilk 4 sonraki aşamaya geçer')).toBeTruthy());
  });

  it('copes with a lone member', async () => {
    mockGetLeague.mockResolvedValue({
      ...active,
      groupSize: 1,
      bands: { promoteCount: 0, demoteCount: 0, tournamentCount: 0 },
      yourRank: 1,
      standings: [{ ...standings[4], rank: 1, zone: null }],
    });
    render(<LeagueScreen />);
    await waitFor(() => expect(screen.getByText('Bronz Lig')).toBeTruthy());
  });

  it('copes with a bracket still being formed', async () => {
    mockGetLeague.mockResolvedValue({ ...base, league: 9, state: 'tournament', tournament: { pending: true, stage: 'qf' } });
    render(<LeagueScreen />);
    await waitFor(() => expect(screen.getByText(require('@/i18n/translate').translate('tr', 'tournament.pending'))).toBeTruthy());
  });

  it('copes with a locked league', async () => {
    mockGetLeague.mockResolvedValue({ ...base, state: 'locked' });
    render(<LeagueScreen />);
    await waitFor(() => expect(screen.getByText(require('@/i18n/translate').translate('tr', 'league.locked.title'))).toBeTruthy());
  });

  it('shows the title, the league card, your rank and a short standings list in the neon layout', async () => {
    // 30 players, you 12th, 3 promote: top rows, ⋯, you with your neighbours.
    const rows = Array.from({ length: 30 }, (_, i) => ({
      rank: i + 1,
      name: i === 11 ? 'Waligo' : `P${i + 1}`,
      frame: null,
      points: 30 - i,
      isYou: i === 11,
      zone: i < 3 ? 'promote' : null,
    }));
    mockGetLeague.mockResolvedValue({ ...active, groupSize: 30, yourRank: 12, yourPoints: 4.82, standings: rows });
    render(<LeagueScreen />);
    await waitFor(() => expect(screen.getByText('Senin sıran')).toBeTruthy());

    expect(screen.getByText('Haftalık lig')).toBeTruthy();
    expect(screen.getByText(/^Her pazartesi \d\d:\d\d'(te|de|da|ta) yeni hafta başlar\.$/)).toBeTruthy();
    expect(screen.getByText(/^Hafta bitişine \d+g \d+s$/)).toBeTruthy();
    expect(screen.getByText('12.')).toBeTruthy();
    expect(screen.getByText('/ 30')).toBeTruthy();
    expect(screen.getByText('Bu hafta: 4,82 Wago')).toBeTruthy();
    expect(screen.getByText('Terfi bölgesine 9 sıra')).toBeTruthy();
    expect(screen.getByText('30 katılımcı')).toBeTruthy();

    // The boundary is a labelled divider, not just colour.
    expect(screen.getByText('Terfi bölgesi ↑')).toBeTruthy();
    // Short list: rows 1-5, 11-13 and the user marked "Sen".
    expect(screen.getByLabelText('4. sıra: P4, 27,00 Wago')).toBeTruthy();
    expect(screen.queryByLabelText('8. sıra: P8, 23,00 Wago')).toBeNull();
    expect(screen.getByLabelText('11. sıra: P11, 20,00 Wago')).toBeTruthy();
    expect(screen.getByTestId('standing-you')).toBeTruthy();
    expect(screen.getAllByText('⋯').length).toBeGreaterThanOrEqual(1);

    fireEvent.press(screen.getByText('Tümünü gör'));
    expect(screen.getByLabelText('8. sıra: P8, 23,00 Wago')).toBeTruthy();
    expect(screen.getByLabelText('30. sıra: P30, 1,00 Wago')).toBeTruthy();
    expect(screen.getByText('Daha az göster')).toBeTruthy();
  });

  it('says when you are in the promotion zone', async () => {
    mockGetLeague.mockResolvedValue({ ...active, yourRank: 2, standings: standings.map((s) => ({ ...s, isYou: s.rank === 2 })) });
    render(<LeagueScreen />);
    await waitFor(() => expect(screen.getByText('Terfi bölgesindesin')).toBeTruthy());
  });
});
