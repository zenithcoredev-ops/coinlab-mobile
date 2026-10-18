import { earnedCount, newlyEarned, vipDaysLeft } from '../badges-api';

const badges = [
  { id: 'night_owl', earnedAt: '2026-10-01T00:00:00Z' },
  { id: 'week_streak', earnedAt: '2026-10-08T00:00:00Z' },
  { id: 'diamond', earnedAt: null },
];

describe('newlyEarned', () => {
  it('lists earned badges the user has not seen yet', () => {
    expect(newlyEarned(badges, ['night_owl'])).toEqual(['week_streak']);
    expect(newlyEarned(badges, [])).toEqual(['night_owl', 'week_streak']);
  });

  it('ignores locked badges', () => {
    expect(newlyEarned(badges, ['night_owl', 'week_streak'])).toEqual([]);
  });
});

describe('earnedCount', () => {
  it('counts only earned badges', () => {
    expect(earnedCount(badges)).toBe(2);
  });
});

describe('vipDaysLeft', () => {
  const now = Date.parse('2026-10-18T12:00:00Z');

  it('rounds partial days up', () => {
    expect(vipDaysLeft('2026-10-19T00:00:00Z', now)).toBe(1);
    expect(vipDaysLeft('2026-10-25T12:00:00Z', now)).toBe(7);
  });

  it('is 0 without VIP or after it expired', () => {
    expect(vipDaysLeft(null, now)).toBe(0);
    expect(vipDaysLeft('2026-10-01T00:00:00Z', now)).toBe(0);
  });
});
