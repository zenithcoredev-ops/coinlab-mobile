import { API_URL, legalPageUrl, PRIVACY_POLICY_URL, TERMS_URL } from '../config';
import { translate } from '@/i18n/translate';
import en from '@/i18n/en';
import tr from '@/i18n/tr';

describe('legal page URLs', () => {
  it('point at the backend pages in the app language', () => {
    expect(API_URL).toBe('https://coinlab-backend-production.up.railway.app');
    expect(PRIVACY_POLICY_URL('tr')).toBe('https://coinlab-backend-production.up.railway.app/privacy?lang=tr');
    expect(PRIVACY_POLICY_URL('en')).toBe('https://coinlab-backend-production.up.railway.app/privacy?lang=en');
    expect(TERMS_URL('tr')).toBe('https://coinlab-backend-production.up.railway.app/terms?lang=tr');
    expect(TERMS_URL('en')).toBe('https://coinlab-backend-production.up.railway.app/terms?lang=en');
    expect(legalPageUrl('delete-account', 'en')).toBe('https://coinlab-backend-production.up.railway.app/delete-account?lang=en');
  });
});

describe('money wording', () => {
  it('the FAQ answers “can CLB be converted into cash” with the single statement', () => {
    expect(translate('tr', 'faq.cash.a')).toBe('CLB uygulama içi bir puandır; parasal değeri yoktur, paraya çevrilemez.');
    expect(translate('en', 'faq.cash.a')).toBe('CLB is an in-app point; it has no monetary value and cannot be converted into money.');
  });

  it('no text promises withdrawals, cash prizes or earnings in money', () => {
    const banned = [
      /nakit|para çek|para kazan|gerçek para|ödeme al|kazanç|gelir|kâr|yatırım|kripto|cüzdan|borsa|\bTL\b|₺|\$/i,
      /\bcash\b(?! *\?)|withdraw|payout|real money|earn(ing)? money|income|profit|invest|crypto|wallet|exchange|\bUSD\b|\$/i,
    ];
    const allowed = new Set(['faq.cash.q']);
    for (const [i, dict] of [tr, en].entries()) {
      for (const [key, text] of Object.entries(dict as Record<string, string>)) {
        if (allowed.has(key)) continue;
        expect([key, banned[i].test(text)]).toEqual([key, false]);
      }
    }
  });
});
