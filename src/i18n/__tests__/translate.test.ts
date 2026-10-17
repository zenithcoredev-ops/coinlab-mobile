import en from '../en';
import tr from '../tr';
import { translate } from '../translate';

describe('translate', () => {
  it('returns the string for the requested language', () => {
    expect(translate('en', 'tabs.mine')).toBe('Mine');
    expect(translate('tr', 'tabs.mine')).toBe('Kazım');
  });

  it('fills placeholders', () => {
    expect(translate('en', 'common.requestFailed', { status: 500 })).toBe('Request failed (500)');
    expect(translate('tr', 'common.requestFailed', { status: 500 })).toBe('İstek başarısız (500)');
  });

  it('has a Turkish string for every English key and the same placeholders', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(tr[key]).toBeTruthy();
      expect(placeholders(tr[key])).toEqual(placeholders(en[key]));
    }
  });
});
