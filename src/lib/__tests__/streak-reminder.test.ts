import { nextStreakReminder, REMINDER_UTC_HOUR } from '../streak-reminder';

const at = (iso: string) => new Date(iso);

describe('nextStreakReminder', () => {
  it('does nothing without a streak to protect', () => {
    expect(nextStreakReminder(at('2026-03-10T08:00:00Z'), { streak: 0, minedToday: false })).toBeNull();
    expect(nextStreakReminder(at('2026-03-10T08:00:00Z'), { streak: 0, minedToday: true })).toBeNull();
  });

  it('reminds this evening (UTC) when the streak is alive but not extended today', () => {
    const next = nextStreakReminder(at('2026-03-10T08:00:00Z'), { streak: 4, minedToday: false });
    expect(next?.toISOString()).toBe(`2026-03-10T${REMINDER_UTC_HOUR}:00:00.000Z`);
  });

  it('skips today when the reminder moment has already passed', () => {
    expect(nextStreakReminder(at('2026-03-10T22:30:00Z'), { streak: 4, minedToday: false })).toBeNull();
    expect(nextStreakReminder(at(`2026-03-10T${REMINDER_UTC_HOUR}:00:30Z`), { streak: 4, minedToday: false })).toBeNull();
  });

  it('after mining today, reminds tomorrow evening', () => {
    const next = nextStreakReminder(at('2026-03-10T08:00:00Z'), { streak: 1, minedToday: true });
    expect(next?.toISOString()).toBe(`2026-03-11T${REMINDER_UTC_HOUR}:00:00.000Z`);
  });

  it('rolls over month ends in UTC', () => {
    const next = nextStreakReminder(at('2026-03-31T10:00:00Z'), { streak: 2, minedToday: true });
    expect(next?.toISOString()).toBe(`2026-04-01T${REMINDER_UTC_HOUR}:00:00.000Z`);
  });
});
