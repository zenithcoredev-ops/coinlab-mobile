import { formatMonthYear } from '../dates';

describe('formatMonthYear', () => {
  it('names the month and year in the app language', () => {
    expect(formatMonthYear(new Date(2026, 9, 14, 12).toISOString(), 'tr')).toBe('Ekim 2026');
    expect(formatMonthYear(new Date(2026, 9, 14, 12).toISOString(), 'en')).toBe('October 2026');
    expect(formatMonthYear(new Date(2026, 1, 1, 12).toISOString(), 'tr')).toBe('Şubat 2026');
  });

  it('is null without a usable date', () => {
    expect(formatMonthYear(null, 'tr')).toBeNull();
    expect(formatMonthYear('not a date', 'tr')).toBeNull();
  });
});
