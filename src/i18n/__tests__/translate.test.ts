import en from '../en';
import tr from '../tr';
import { translate } from '../translate';

describe('translate', () => {
  it('returns the string for the requested language', () => {
    expect(translate('en', 'tabs.mine')).toBe('Collect');
    expect(translate('tr', 'tabs.mine')).toBe('Topla');
  });

  it('fills placeholders', () => {
    expect(translate('en', 'common.requestFailed', { status: 500 })).toBe('Request failed (500)');
    expect(translate('tr', 'common.requestFailed', { status: 500 })).toBe('İstek başarısız (500)');
  });

  it('picks the plural form from count', () => {
    expect(translate('en', 'streak.days', { count: 1 })).toBe('1 day');
    expect(translate('en', 'streak.days', { count: 0 })).toBe('0 days');
    expect(translate('en', 'streak.days', { count: 5 })).toBe('5 days');
    expect(translate('tr', 'streak.days', { count: 5 })).toBe('5 gün');
  });

  it('has a Turkish string for every English key and the same placeholders', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(tr[key]).toBeTruthy();
      expect(placeholders(tr[key])).toEqual(placeholders(en[key]));
    }
  });

  // The League tab closed the app: these plain keys take {count}, and translate looked up
  // `league.promoteReq_other`, got undefined and threw on `.split`.
  it('uses a plain key that takes {count} as it is', () => {
    expect(translate('tr', 'league.promoteReq', { count: 3, size: 30 })).toBe(translate('tr', 'league.promoteReq').replace('{count}', '3').replace('{size}', '30'));
    expect(translate('en', 'league.promoteReq', { count: 3, size: 30 })).toBe('Promotion: top 3 of 30');
    expect(translate('en', 'league.diamondTop', { count: 1 })).toBe('Top 1 this week join the Diamond Tournament');
    expect(translate('en', 'tournament.advanceRule', { count: 4, size: 8 })).toBe('Top 4 of 8 advance to the next stage');
  });

  it('never returns undefined, even for a key it doesn’t know', () => {
    expect(translate('tr', 'league.name.10' as never)).toBe('league.name.10');
    expect(translate('tr', undefined as never, { count: 2 })).toBe('undefined');
  });
});
