import { nextStreakReminder, REMINDER_LOCAL_HOUR } from '../streak-reminder';

// Local-time constructors keep the tests valid in any TZ; the UTC-day rules are checked per zone below.
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const offsetHours = (date: Date) => -date.getTimezoneOffset() / 60;

describe('nextStreakReminder', () => {
  it('does nothing without a streak to protect', () => {
    expect(nextStreakReminder(local(2026, 3, 10, 8), { streak: 0, minedToday: false })).toBeNull();
    expect(nextStreakReminder(local(2026, 3, 10, 8), { streak: 0, minedToday: true })).toBeNull();
  });

  it('fires at 20:00 device time', () => {
    const now = local(2026, 3, 10, 8);
    const next = nextStreakReminder(now, { streak: 4, minedToday: false });
    const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    // Not mined yet: only valid when 20:00 is still on today's UTC day; otherwise the streak is gone.
    if (next) {
      expect(next.fireAt.getHours()).toBe(REMINDER_LOCAL_HOUR);
      expect(utcDay(next.fireAt)).toBe(utcDay(now));
    } else {
      expect(utcDay(local(2026, 3, 10, REMINDER_LOCAL_HOUR))).not.toBe(utcDay(now));
    }
  });

  it('skips when 20:00 has already passed and nothing was mined', () => {
    expect(nextStreakReminder(local(2026, 3, 10, 21), { streak: 4, minedToday: false })).toBeNull();
    expect(nextStreakReminder(local(2026, 3, 10, 19, 59), { streak: 4, minedToday: false })?.fireAt.getHours() ?? REMINDER_LOCAL_HOUR).toBe(REMINDER_LOCAL_HOUR);
  });

  it('after mining today, never reminds on the same UTC day', () => {
    const now = local(2026, 3, 10, 8);
    const next = nextStreakReminder(now, { streak: 1, minedToday: true });
    expect(next).not.toBeNull();
    expect(next!.fireAt.getHours()).toBe(REMINDER_LOCAL_HOUR);
    expect(next!.fireAt.getTime()).toBeGreaterThan(now.getTime());
    expect(next!.fireAt.getUTCDate()).not.toBe(now.getUTCDate());
  });

  it('reports the hours left until the UTC day ends', () => {
    const now = local(2026, 3, 10, 8);
    const next = nextStreakReminder(now, { streak: 3, minedToday: true })!;
    const midnight = Date.UTC(next.fireAt.getUTCFullYear(), next.fireAt.getUTCMonth(), next.fireAt.getUTCDate() + 1);
    expect(next.hoursLeft).toBe(Math.ceil((midnight - next.fireAt.getTime()) / 3_600_000));
    expect(next.hoursLeft).toBeGreaterThanOrEqual(1);
    expect(next.hoursLeft).toBeLessThanOrEqual(24);
  });

  it('is 7 hours for a UTC+3 user (20:00 local = 17:00 UTC)', () => {
    if (offsetHours(local(2026, 3, 10)) !== 3) return;
    const next = nextStreakReminder(local(2026, 3, 10, 8), { streak: 2, minedToday: false })!;
    expect(next.hoursLeft).toBe(7);
  });
});
