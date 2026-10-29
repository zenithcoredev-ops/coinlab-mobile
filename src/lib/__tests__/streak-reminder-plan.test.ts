import { LocalClock, nextStreakReminder, planStreakReminders, ReminderInput } from '../streak-reminder';

// Jest can't switch the process time zone per file, so these tests run the planner on a clock for
// a named zone instead of the device's.
function zone(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  const parts = (d: Date) =>
    Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, Number(p.value)])) as Record<string, number>;
  const offsetMs = (t: number) => {
    const p = parts(new Date(t));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(t / 60_000) * 60_000;
  };
  /** The instant the wall clock in this zone reads y-m-d h:min. */
  const at = (y: number, m: number, d: number, h = 0, min = 0) => {
    const wall = Date.UTC(y, m - 1, d, h, min);
    return new Date(wall - offsetMs(wall - offsetMs(wall)));
  };
  const clock: LocalClock = (day, dayOffset, hour) => {
    const p = parts(day);
    return at(p.year, p.month, p.day + dayOffset, hour);
  };
  return { at, clock };
}

const istanbul = zone('Europe/Istanbul');
const newYork = zone('America/New_York');
const HOUR = 3_600_000;

function session(startedAt: Date) {
  return { startedAt: startedAt.toISOString(), endsAt: new Date(startedAt.getTime() + 24 * HOUR).toISOString() };
}

describe('zone helper', () => {
  it('maps wall time to the right instant', () => {
    expect(istanbul.at(2026, 3, 10, 20).toISOString()).toBe('2026-03-10T17:00:00.000Z');
    expect(newYork.at(2026, 1, 10, 20).toISOString()).toBe('2026-01-11T01:00:00.000Z');
    expect(newYork.at(2026, 7, 10, 20).toISOString()).toBe('2026-07-11T00:00:00.000Z');
  });
});

describe('planStreakReminders', () => {
  it('mining started at 00:30 in Turkey: one reminder at 20:00 on the last covered day, never during the session', () => {
    const start = istanbul.at(2026, 3, 10, 0, 30); // 21:30 UTC the day before
    const input: ReminderInput = {
      streak: 5,
      minedToday: true,
      // The session runs into the 11th, so the 11th counts too: the streak ends at midnight on the 12th.
      streakExpiresAt: istanbul.at(2026, 3, 12).toISOString(),
      session: session(start),
    };
    const plan = planStreakReminders(start, input, istanbul.clock);
    expect(plan).toEqual([{ kind: 'streak', fireAt: istanbul.at(2026, 3, 11, 20), hoursLeft: 4 }]);
    expect(plan[0].fireAt.getTime()).toBeGreaterThanOrEqual(Date.parse(input.session!.endsAt));
  });

  it('never reminds to start mining at 20:00 while a session is running', () => {
    const now = istanbul.at(2026, 3, 10, 12);
    const running = session(istanbul.at(2026, 3, 10, 19));
    // A server that (wrongly) still says today is at risk.
    expect(
      planStreakReminders(now, { streak: 2, minedToday: false, streakExpiresAt: istanbul.at(2026, 3, 11).toISOString(), session: running }, istanbul.clock)
    ).toEqual([]);
    // No streak: the day whose 20:00 the session covers is skipped, not replaced.
    expect(planStreakReminders(now, { streak: 0, minedToday: false, streakExpiresAt: null, session: running }, istanbul.clock)).toEqual([
      { kind: 'notStarted', fireAt: istanbul.at(2026, 3, 11, 20) },
      { kind: 'notStarted', fireAt: istanbul.at(2026, 3, 12, 20) },
    ]);
  });

  it('with no streak, reminds at 20:00 on at most 3 days in a row', () => {
    const input: ReminderInput = { streak: 0, minedToday: false, streakExpiresAt: null, session: null };
    expect(planStreakReminders(istanbul.at(2026, 3, 10, 8), input, istanbul.clock)).toEqual([
      { kind: 'notStarted', fireAt: istanbul.at(2026, 3, 10, 20) },
      { kind: 'notStarted', fireAt: istanbul.at(2026, 3, 11, 20) },
      { kind: 'notStarted', fireAt: istanbul.at(2026, 3, 12, 20) },
    ]);
    // Past today's 20:00: starts tomorrow.
    expect(planStreakReminders(istanbul.at(2026, 3, 10, 21), input, istanbul.clock).map((r) => r.fireAt)).toEqual([
      istanbul.at(2026, 3, 11, 20),
      istanbul.at(2026, 3, 12, 20),
      istanbul.at(2026, 3, 13, 20),
    ]);
  });

  it('skips a reminder that is already past or leaves under 10 minutes', () => {
    const expires = istanbul.at(2026, 3, 11).toISOString();
    const input = { streak: 3, minedToday: false, streakExpiresAt: expires, session: null };
    expect(planStreakReminders(istanbul.at(2026, 3, 10, 20, 30), input, istanbul.clock)).toEqual([]);

    // Expiry not at local midnight (device and server zones disagree): 20:00 must leave 10 minutes.
    const now = istanbul.at(2026, 3, 10, 8);
    const near = (min: number) => ({ ...input, streakExpiresAt: istanbul.at(2026, 3, 10, 20, min).toISOString() });
    expect(planStreakReminders(now, near(9), istanbul.clock)).toEqual([]);
    expect(planStreakReminders(now, near(11), istanbul.clock)).toEqual([
      { kind: 'streak', fireAt: istanbul.at(2026, 3, 10, 20), hoursLeft: 1 },
    ]);
  });

  it('reminds at 20:00 local in New York, including across daylight-saving changes', () => {
    const remind = (expiry: Date, now: Date) =>
      planStreakReminders(now, { streak: 7, minedToday: false, streakExpiresAt: expiry.toISOString(), session: null }, newYork.clock);

    // 20:00 EDT is already the next UTC day; the old UTC rule sent nothing here.
    expect(remind(newYork.at(2026, 7, 11), newYork.at(2026, 7, 10, 9))).toEqual([
      { kind: 'streak', fireAt: newYork.at(2026, 7, 10, 20), hoursLeft: 4 },
    ]);
    // Clocks go back at 02:00 on 1 Nov and forward on 8 Mar.
    expect(remind(newYork.at(2026, 11, 2), newYork.at(2026, 10, 31, 12))).toEqual([
      { kind: 'streak', fireAt: newYork.at(2026, 11, 1, 20), hoursLeft: 4 },
    ]);
    expect(remind(newYork.at(2026, 3, 9), newYork.at(2026, 3, 7, 12))).toEqual([
      { kind: 'streak', fireAt: newYork.at(2026, 3, 8, 20), hoursLeft: 4 },
    ]);
    expect(newYork.at(2026, 11, 1, 20).toISOString()).toBe('2026-11-02T01:00:00.000Z');
    expect(newYork.at(2026, 3, 8, 20).toISOString()).toBe('2026-03-09T00:00:00.000Z');
  });

  it('falls back to the UTC-day rule when the server sends no streakExpiresAt', () => {
    const now = new Date(2026, 2, 10, 8);
    for (const minedToday of [true, false]) {
      const legacy = nextStreakReminder(now, { streak: 4, minedToday });
      expect(planStreakReminders(now, { streak: 4, minedToday })).toEqual(legacy ? [{ kind: 'streak', ...legacy }] : []);
    }
    expect(planStreakReminders(now, { streak: 0, minedToday: false })).toEqual([]);
    // A streak with a null expiry is inconsistent; the old rule is the safer bet.
    expect(planStreakReminders(now, { streak: 4, minedToday: true, streakExpiresAt: null })).toEqual([
      { kind: 'streak', ...nextStreakReminder(now, { streak: 4, minedToday: true })! },
    ]);
  });
});
