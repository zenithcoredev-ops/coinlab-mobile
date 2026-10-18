import { badgeCard, promotionCard, shareMessage, tournamentCard } from '../share';
import type { LeagueResult, TournamentResult } from '@/services/league-api';

const league = (resultType: LeagueResult['resultType']): LeagueResult => ({
  weekEnd: '2026-10-19T00:00:00Z',
  resultType,
  fromLeague: 2,
  toLeague: resultType === 'promote' ? 3 : 2,
  rank: 4,
  points: 12.345,
});

const final = (rank: number, withReward: boolean): TournamentResult => ({
  id: 'b1',
  stage: 'final',
  outcome: 'final',
  rank,
  reward: withReward ? { clb: 250, vipDays: 30, frame: 'champion' } : null,
});

describe('badgeCard', () => {
  it('shows the badge icon and name', () => {
    expect(badgeCard('night_owl')).toMatchObject({ icon: '🦉', subtitle: { key: 'badge.night_owl.name' } });
  });
});

describe('promotionCard', () => {
  it('is created only for promotions, with the new league icon', () => {
    expect(promotionCard(league('promote'))).toMatchObject({ icon: '🔷', subtitle: { params: { rank: 4, points: '12.35' } } });
    expect(promotionCard(league('stay'))).toBeNull();
    expect(promotionCard(league('demote'))).toBeNull();
  });
});

describe('tournamentCard', () => {
  it('is created for rewarded final placements only', () => {
    expect(tournamentCard(final(1, true))).toMatchObject({ icon: '🏆', title: { key: 'share.tournament.first' } });
    expect(tournamentCard(final(3, true))).toMatchObject({ icon: '🥉' });
    expect(tournamentCard(final(4, false))).toBeNull();
    expect(tournamentCard({ ...final(1, true), outcome: 'advanced' })).toBeNull();
  });
});

describe('shareMessage', () => {
  it('appends the invite line when a code is known', () => {
    expect(shareMessage('Title', 'Sub', 'CLB-ABCDE', (c) => `Use ${c}`)).toBe('Title\nSub\n\nUse CLB-ABCDE');
  });

  it('is just the card text without a code', () => {
    expect(shareMessage('Title', 'Sub', null, (c) => c)).toBe('Title\nSub');
  });
});
