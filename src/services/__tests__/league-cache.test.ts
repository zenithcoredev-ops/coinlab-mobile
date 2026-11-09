import { leagueSnapshotOf, leagueWeekEndFor, loadLeagueSnapshot, onLeagueSnapshot, saveLeagueSnapshot } from '../league-cache';
import type { LeagueView } from '../league-api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const base = { serverTime: '', league: 2, speedBonus: 0, entry: { required: 30, balance: 40 }, lastResult: null, tournamentResult: null, tournamentRewards: [] };
const view = (over: Partial<LeagueView>) => ({ ...base, state: 'active', ...over }) as LeagueView;

// What the Collect screen's league card reads from the snapshot.
const card = { state: 'active', league: 2, rank: null, entryRequired: 30 };

describe('league cache', () => {
  it('keeps the rank and the promotion band for the Collect screen’s league card', () => {
    const s = leagueSnapshotOf(view({ yourRank: 12, bands: { promoteCount: 9, demoteCount: 5, tournamentCount: 0 } } as Partial<LeagueView>), 5);
    expect(s).toMatchObject({ league: 2, rank: 12, promoteCount: 9, tournamentCount: 0 });
  });

  it('knows whether the user is in a league and when its week (or tournament stage) ends', () => {
    expect(leagueSnapshotOf(view({ weekEnd: '2026-03-16T00:00:00Z' }), 5)).toEqual({ inLeague: true, weekEnd: '2026-03-16T00:00:00Z', savedAt: 5, ...card });
    expect(leagueSnapshotOf(view({ state: 'locked' }), 5)).toEqual({ inLeague: false, weekEnd: null, savedAt: 5, ...card, state: 'locked' });
    const tournament = view({
      state: 'tournament',
      tournament: { pending: false, stage: 'qf', stageNumber: 1, stageCount: 3, weekEnd: '2026-03-23T00:00:00Z', size: 8, advanceCount: 6, yourRank: 2, yourPoints: 1, standings: [] },
    });
    expect(leagueSnapshotOf(tournament, 5).weekEnd).toBe('2026-03-23T00:00:00Z');
  });

  it('uses the saved week end while ahead, else the next Monday 00:00 UTC; nothing outside a league', () => {
    const now = new Date('2026-03-18T12:00:00Z');
    expect(leagueWeekEndFor({ inLeague: true, weekEnd: '2026-03-23T00:00:00Z', savedAt: 0 }, now)).toEqual(new Date('2026-03-23T00:00:00Z'));
    expect(leagueWeekEndFor({ inLeague: true, weekEnd: '2026-03-16T00:00:00Z', savedAt: 0 }, now)).toEqual(new Date('2026-03-23T00:00:00Z'));
    expect(leagueWeekEndFor({ inLeague: false, weekEnd: null, savedAt: 0 }, now)).toBeNull();
    expect(leagueWeekEndFor(null, now)).toBeNull();
  });

  it('saves, loads and tells the planner', async () => {
    const heard = jest.fn();
    const stop = onLeagueSnapshot(heard);
    await saveLeagueSnapshot(view({ weekEnd: '2026-03-16T00:00:00Z' }), 7);
    expect(heard).toHaveBeenCalledWith({ inLeague: true, weekEnd: '2026-03-16T00:00:00Z', savedAt: 7, ...card });
    expect(await loadLeagueSnapshot()).toEqual({ inLeague: true, weekEnd: '2026-03-16T00:00:00Z', savedAt: 7, ...card });
    stop();
  });
});
