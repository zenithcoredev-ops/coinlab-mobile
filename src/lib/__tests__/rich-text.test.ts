import { translate } from '@/i18n/translate';
import { highlighted } from '../rich-text';

describe('highlighted', () => {
  it('marks the amounts, with their "+" and unit, in the Turkish and English invite text', () => {
    const tr = highlighted(translate('tr', 'friends.benefit'), { rate: '0,20', bonus: '25' });
    expect(tr.filter((p) => p.value).map((p) => p.text)).toEqual(['+0,20 Wago/saat', '+25 Wago']);
    expect(tr.map((p) => p.text).join('')).toBe(translate('tr', 'friends.benefit', { rate: '0,20', bonus: '25' }));

    const en = highlighted(translate('en', 'friends.benefit'), { rate: '0.20', bonus: '25' });
    expect(en.filter((p) => p.value).map((p) => p.text)).toEqual(['+0.20 Wago/h', '+25 Wago']);
  });

  it('leaves text without values as one plain part', () => {
    expect(highlighted('Merhaba', {})).toEqual([{ text: 'Merhaba', value: false }]);
  });
});
