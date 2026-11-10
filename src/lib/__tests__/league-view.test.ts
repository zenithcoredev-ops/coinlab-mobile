import { rankStatus, shortCountdown, SHORT_LIST_AFTER, standingsList, TOP_ROWS } from '../league-view';

const rows = (n: number, you: number, promote: number, demote = 0) =>
  Array.from({ length: n }, (_, i) => ({
    rank: i + 1,
    isYou: i + 1 === you,
    zone: (i < promote ? 'promote' : i >= n - demote ? 'demote' : null) as 'promote' | 'demote' | null,
  }));
const describeList = (items: ReturnType<typeof standingsList>) =>
  items.map((it) => (it.kind === 'row' ? String(it.row.rank) : it.kind === 'gap' ? '⋯' : it.zone === 'promote' ? '↑' : '↓')).join(' ');

describe('standingsList', () => {
  it('shows a short group in full, with the promotion divider under the last promoted row', () => {
    expect(describeList(standingsList(rows(6, 4, 2), false))).toBe('1 2 ↑ 3 4 5 6');
  });

  it('shortens a long group: top rows, ⋯, the user with one above and below, ⋯', () => {
    expect(describeList(standingsList(rows(30, 12, 3, 5), false))).toBe('1 2 3 ↑ 4 5 ⋯ 11 12 13 ⋯');
    // Expanded: everything, with both dividers.
    const all = describeList(standingsList(rows(30, 12, 3, 5), true));
    expect(all.startsWith('1 2 3 ↑ 4 5 6')).toBe(true);
    expect(all.endsWith('25 ↓ 26 27 28 29 30')).toBe(true);
  });

  it('puts the demotion divider in the short list when the user is near the bottom', () => {
    expect(describeList(standingsList(rows(30, 27, 3, 5), false))).toBe(`1 2 3 ↑ 4 5 ⋯ ↓ 26 27 28 ⋯`);
    // The zone's first rows are skipped: the divider still comes before the first shown one.
    expect(describeList(standingsList(rows(30, 30, 3, 5), false))).toBe('1 2 3 ↑ 4 5 ⋯ ↓ 29 30');
    // A promotion zone longer than the top rows: the divider sits under the last shown promoted row.
    expect(describeList(standingsList(rows(30, 20, 9), false))).toBe('1 2 3 4 5 ↑ ⋯ 19 20 21 ⋯');
  });

  it('does not repeat rows when the user is among the top rows', () => {
    expect(describeList(standingsList(rows(30, 2, 3), false))).toBe('1 2 3 ↑ 4 5 ⋯');
    expect(TOP_ROWS).toBeLessThan(SHORT_LIST_AFTER);
  });

  it('handles a lone member and an empty list', () => {
    expect(describeList(standingsList(rows(1, 1, 0), false))).toBe('1');
    expect(standingsList([], false)).toEqual([]);
  });
});

describe('rankStatus', () => {
  const bands = { promoteCount: 9, tournamentCount: 0 };
  it('counts the places to the promotion zone', () => {
    expect(rankStatus({ rank: 12, zone: null }, bands, false)).toEqual({ kind: 'toPromotion', places: 3 });
    expect(rankStatus({ rank: 4, zone: 'promote' }, bands, false)).toEqual({ kind: 'inPromotion' });
    expect(rankStatus({ rank: 28, zone: 'demote' }, bands, false)).toEqual({ kind: 'inDemotion' });
    expect(rankStatus({ rank: 2, zone: null }, { promoteCount: 0, tournamentCount: 0 }, false)).toEqual({ kind: 'noPromotion' });
  });

  it('counts the places to the tournament in Diamond', () => {
    expect(rankStatus({ rank: 10, zone: null }, { promoteCount: 0, tournamentCount: 8 }, true)).toEqual({ kind: 'toTournament', places: 2 });
    expect(rankStatus({ rank: 3, zone: null }, { promoteCount: 0, tournamentCount: 8 }, true)).toEqual({ kind: 'inTournament' });
  });

  it('says nothing without a rank or bands', () => {
    expect(rankStatus(undefined, bands, false)).toBeNull();
    expect(rankStatus({ rank: 1, zone: null }, undefined, false)).toBeNull();
  });
});

describe('shortCountdown', () => {
  it('splits into days, hours and minutes', () => {
    expect(shortCountdown((2 * 24 + 14) * 3_600_000 + 5 * 60_000)).toEqual({ days: 2, hours: 14, minutes: 5, withDays: true });
    expect(shortCountdown(5 * 3_600_000 + 12 * 60_000)).toEqual({ days: 0, hours: 5, minutes: 12, withDays: false });
    expect(shortCountdown(-5)).toEqual({ days: 0, hours: 0, minutes: 0, withDays: false });
  });
});
