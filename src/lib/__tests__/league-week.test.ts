import { translate } from '@/i18n/translate';
import type { Language } from '@/i18n/translate';

import { leagueWeekEndParams, nextLeagueWeekEnd } from '../league-week';

const params = (language: Language, utcOffsetMinutes: number, now = new Date('2026-03-11T12:00:00Z')) =>
  leagueWeekEndParams((key, p) => translate(language, key, p), language, now, utcOffsetMinutes);

describe('nextLeagueWeekEnd', () => {
  it('is the coming Monday 00:00 UTC', () => {
    expect(nextLeagueWeekEnd(new Date('2026-03-11T12:00:00Z')).toISOString()).toBe('2026-03-16T00:00:00.000Z'); // Wed
    expect(nextLeagueWeekEnd(new Date('2026-03-15T23:59:00Z')).toISOString()).toBe('2026-03-16T00:00:00.000Z'); // Sun
    expect(nextLeagueWeekEnd(new Date('2026-03-16T00:00:00Z')).toISOString()).toBe('2026-03-23T00:00:00.000Z'); // Mon
  });
});

describe('leagueWeekEndParams', () => {
  it('shows Monday 00:00 UTC on the user’s clock', () => {
    expect(params('tr', 180)).toEqual({ day: 'Pazartesi', time: "03:00'te" }); // Istanbul
    expect(params('en', 180)).toEqual({ day: 'Monday', time: '3:00 AM' });
    expect(params('tr', 0)).toEqual({ day: 'Pazartesi', time: "00:00'da" });
    expect(params('en', 0)).toEqual({ day: 'Monday', time: '12:00 AM' });
    expect(params('tr', 330)).toEqual({ day: 'Pazartesi', time: "05:30'da" }); // India
    expect(params('en', 840)).toEqual({ day: 'Monday', time: '2:00 PM' }); // Kiritimati
    expect(params('tr', 840)).toEqual({ day: 'Pazartesi', time: "14:00'te" });
  });

  it('moves to the previous day when it falls before midnight locally', () => {
    expect(params('en', -240)).toEqual({ day: 'Sunday', time: '8:00 PM' }); // New York, summer
    expect(params('tr', -240)).toEqual({ day: 'Pazar', time: "20:00'de" });
    expect(params('en', -300)).toEqual({ day: 'Sunday', time: '7:00 PM' }); // New York, winter
    expect(params('tr', -300)).toEqual({ day: 'Pazar', time: "19:00'da" });
  });

  it('fills the league texts', () => {
    expect(translate('tr', 'league.how.step3', params('tr', 180))).toBe(
      "Haftalar her Pazartesi 03:00'te biter. Grubun sunucuda sıralanır."
    );
    expect(translate('en', 'league.how.step3', params('en', -240))).toBe(
      'Weeks end every Sunday at 8:00 PM. Your group is ranked on the server.'
    );
    expect(translate('en', 'faq.league.a', params('en', 180))).toMatch(/Weeks end every Monday at 3:00 AM\.$/);
    expect(translate('tr', 'faq.league.a', params('tr', -300))).toMatch(/Haftalar her Pazar 19:00'da biter\.$/);
  });

  it('uses the device offset at the week’s end by default', () => {
    const now = new Date('2026-03-11T12:00:00Z');
    const offset = -nextLeagueWeekEnd(now).getTimezoneOffset();
    const t = (key: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate('en', key, p);
    expect(leagueWeekEndParams(t, 'en', now)).toEqual(params('en', offset, now));
  });
});
