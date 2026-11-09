import type { Language, Translate } from '@/i18n/translate';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_KEYS = [
  'weekday.sun',
  'weekday.mon',
  'weekday.tue',
  'weekday.wed',
  'weekday.thu',
  'weekday.fri',
  'weekday.sat',
] as const;

/** League weeks end every Monday at 00:00 UTC for everyone; this is the next such moment. */
export function nextLeagueWeekEnd(now: Date): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysToMonday = (8 - now.getUTCDay()) % 7 || 7;
  return new Date(today + daysToMonday * DAY_MS);
}

// Turkish locative suffix for a number as read aloud: üç→'te, altı→'da, yirmi→'de, kırk→'ta.
const TR_ONES = ['', "'de", "'de", "'te", "'te", "'te", "'da", "'de", "'de", "'da"];
const TR_TENS = ["'da", "'da", "'de", "'da", "'ta", "'de"];
function trLocative(n: number): string {
  return n % 10 ? TR_ONES[n % 10] : TR_TENS[n / 10];
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * `{day}` and `{time}` for the league texts: when the week ends on the user's clock, e.g.
 * "Pazartesi" / "03:00'te" in Istanbul or "Sunday" / "8:00 PM" in New York (summer).
 * `utcOffsetMinutes` defaults to the device's offset at that moment, so daylight saving is right.
 */
export function leagueWeekEndParams(
  t: Translate,
  language: Language,
  now: Date,
  utcOffsetMinutes?: number
): { day: string; time: string } {
  const end = nextLeagueWeekEnd(now);
  const offset = utcOffsetMinutes ?? -end.getTimezoneOffset();
  const local = new Date(end.getTime() + offset * 60_000);
  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  const day = t(WEEKDAY_KEYS[local.getUTCDay()]);

  if (language === 'tr') {
    return { day, time: `${pad(hour)}:${pad(minute)}${trLocative(minute || hour)}` };
  }
  return { day, time: `${hour % 12 || 12}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}` };
}

const WEEKDAY_SHORT_KEYS = [
  'weekdayShort.sun',
  'weekdayShort.mon',
  'weekdayShort.tue',
  'weekdayShort.wed',
  'weekdayShort.thu',
  'weekdayShort.fri',
  'weekdayShort.sat',
] as const;

/**
 * A short "when the week ends" on the user's clock, for small cards: "Pzt 03:00" or "Sun 8:00 PM".
 * `end` is the saved week end when there is one; otherwise the next Monday 00:00 UTC.
 */
export function leagueWeekEndShort(t: Translate, language: Language, now: Date, end?: Date | null, utcOffsetMinutes?: number): string {
  const at = end && end.getTime() > now.getTime() ? end : nextLeagueWeekEnd(now);
  const offset = utcOffsetMinutes ?? -at.getTimezoneOffset();
  const local = new Date(at.getTime() + offset * 60_000);
  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  const day = t(WEEKDAY_SHORT_KEYS[local.getUTCDay()]);
  const time = language === 'tr' ? `${pad(hour)}:${pad(minute)}` : `${hour % 12 || 12}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
  return `${day} ${time}`;
}
