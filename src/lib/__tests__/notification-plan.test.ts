import { translate } from '@/i18n/translate';
import { ALL_TYPES_ON, DAILY_LIMIT, leagueReminderTime, outOfQuietHours, PlanInput, planNotifications, VARIANTS } from '../notification-plan';
import { LocalClock, planStreakReminders } from '../streak-reminder';

// Jest can't switch the process time zone per file, so the planner runs on a clock for a named zone.
function zone(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  const parts = (d: Date) => Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, Number(p.value)])) as Record<string, number>;
  const offsetMs = (t: number) => {
    const p = parts(new Date(t));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(t / 60_000) * 60_000;
  };
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

const ist = zone('Europe/Istanbul');
const ny = zone('America/New_York');
const HOUR = 3_600_000;
const iso = (d: Date) => d.toISOString();
const noStreak = { streak: 0, minedToday: false, streakExpiresAt: null, session: null };

const plan = (now: Date, input: Partial<PlanInput>, clock = ist.clock, sent: { type: 'sessionEnd'; fireAt: number }[] = [], prefs = ALL_TYPES_ON) =>
  planNotifications(now, { streak: null, session: null, ...input }, prefs, sent, clock);
const of = (list: ReturnType<typeof plan>, type: string) => list.filter((n) => n.type === type);

describe('outOfQuietHours', () => {
  it('moves 22:00-09:00 to the next 09:00 and leaves the day alone', () => {
    expect(outOfQuietHours(ist.at(2026, 3, 10, 23, 30), ist.clock)).toEqual(ist.at(2026, 3, 11, 9));
    expect(outOfQuietHours(ist.at(2026, 3, 10, 22), ist.clock)).toEqual(ist.at(2026, 3, 11, 9));
    expect(outOfQuietHours(ist.at(2026, 3, 10, 3, 15), ist.clock)).toEqual(ist.at(2026, 3, 10, 9));
    expect(outOfQuietHours(ist.at(2026, 3, 10, 9), ist.clock)).toEqual(ist.at(2026, 3, 10, 9));
    expect(outOfQuietHours(ist.at(2026, 3, 10, 21, 59), ist.clock)).toEqual(ist.at(2026, 3, 10, 21, 59));
  });

  it('uses local time across a daylight-saving change (New York, 1 Nov)', () => {
    expect(outOfQuietHours(ny.at(2026, 10, 31, 23), ny.clock)).toEqual(ny.at(2026, 11, 1, 9));
    expect(ny.at(2026, 11, 1, 9).toISOString()).toBe('2026-11-01T14:00:00.000Z'); // EST after the change
  });
});

describe('session end', () => {
  it('fires when the session ends, on the collecting channel, opening the Collect tab', () => {
    const now = ist.at(2026, 3, 10, 10);
    const session = { startedAt: iso(ist.at(2026, 3, 9, 18)), endsAt: iso(ist.at(2026, 3, 10, 18)) };
    expect(of(plan(now, { session }), 'sessionEnd')).toEqual([
      expect.objectContaining({ id: 'notif-sessionEnd-0', fireAt: ist.at(2026, 3, 10, 18), channel: 'collect', route: '/(tabs)' }),
    ]);
  });

  it('ending in quiet hours, it comes at 09:00', () => {
    const now = ist.at(2026, 3, 10, 10);
    const session = { startedAt: iso(ist.at(2026, 3, 9, 23, 30)), endsAt: iso(ist.at(2026, 3, 10, 23, 30)) };
    expect(of(plan(now, { session }), 'sessionEnd')[0].fireAt).toEqual(ist.at(2026, 3, 11, 9));
  });

  it('is not planned without a session or once it has ended', () => {
    const now = ist.at(2026, 3, 10, 10);
    expect(of(plan(now, {}), 'sessionEnd')).toEqual([]);
    const ended = { startedAt: iso(ist.at(2026, 3, 9, 9)), endsAt: iso(ist.at(2026, 3, 10, 9)) };
    expect(of(plan(now, { session: ended }), 'sessionEnd')).toEqual([]);
  });
});

describe('streak', () => {
  it('keeps the streak reminder rules exactly (time, count, hours left), on the streak channel', () => {
    const now = ist.at(2026, 10, 31, 10);
    const streak = { streak: 8, minedToday: true, streakExpiresAt: iso(ist.at(2026, 11, 3)), session: null };
    const expected = planStreakReminders(now, streak, ist.clock);
    const planned = of(plan(now, { streak }), 'streak');
    expect(planned.map((n) => n.fireAt)).toEqual(expected.map((r) => r.fireAt));
    expect(planned[0]).toMatchObject({ channel: 'streak', route: '/(tabs)', params: { count: 9, hours: 4 } });
    expect(VARIANTS.streak).toContain(planned[0].textKey);
  });

  it('with no streak, the "not started" days are streak notifications too', () => {
    const planned = of(plan(ist.at(2026, 3, 10, 8), { streak: noStreak }), 'streak');
    expect(planned.map((n) => n.fireAt)).toEqual([ist.at(2026, 3, 10, 20), ist.at(2026, 3, 11, 20), ist.at(2026, 3, 12, 20)]);
    for (const n of planned) expect(VARIANTS.notStarted).toContain(n.textKey);
  });

  it('stays silent while a session covers 20:00 (the existing rule)', () => {
    const now = ist.at(2026, 3, 10, 12);
    const session = { startedAt: iso(ist.at(2026, 3, 10, 19)), endsAt: iso(ist.at(2026, 3, 11, 19)) };
    const planned = of(plan(now, { streak: { ...noStreak, session }, session }), 'streak');
    expect(planned.map((n) => n.fireAt)).toEqual([ist.at(2026, 3, 11, 20), ist.at(2026, 3, 12, 20)]);
  });
});

describe('come back', () => {
  it('reminds at 19:00 two, four and seven days after the app was last open, then stops', () => {
    const now = ist.at(2026, 3, 10, 12);
    const planned = of(plan(now, {}), 'comeback');
    expect(planned.map((n) => n.fireAt)).toEqual([ist.at(2026, 3, 12, 19), ist.at(2026, 3, 14, 19), ist.at(2026, 3, 17, 19)]);
    expect(planned.map((n) => n.id)).toEqual(['notif-comeback-0', 'notif-comeback-1', 'notif-comeback-2']);
    expect(new Set(planned.map((n) => n.channel))).toEqual(new Set(['reminders']));
  });
});

describe('league', () => {
  // Weeks end Monday 00:00 UTC: 03:00 Monday in Istanbul, 20:00 Sunday (EDT) in New York.
  const weekEnd = new Date('2026-03-16T00:00:00Z');

  it('reminds at the last local 20:00 at least 2 h before the week ends', () => {
    expect(leagueReminderTime(weekEnd, ist.clock)).toEqual(ist.at(2026, 3, 15, 20)); // Sunday evening
    expect(leagueReminderTime(weekEnd, ny.clock)).toEqual(ny.at(2026, 3, 14, 20)); // Saturday: Sunday 20:00 is the end
  });

  it('only for someone in a league, on the league channel, opening the League tab', () => {
    const now = ist.at(2026, 3, 13, 12);
    expect(of(plan(now, { league: { weekEndsAt: weekEnd } }), 'league')).toEqual([
      expect.objectContaining({ id: 'notif-league-0', fireAt: ist.at(2026, 3, 15, 20), channel: 'league', route: '/(tabs)/league' }),
    ]);
    expect(of(plan(now, { league: null }), 'league')).toEqual([]);
    expect(of(plan(ist.at(2026, 3, 15, 21), { league: { weekEndsAt: weekEnd } }), 'league')).toEqual([]); // already past
  });
});

describe('steps', () => {
  const session = { startedAt: iso(ist.at(2026, 3, 10, 8)), endsAt: iso(ist.at(2026, 3, 11, 8)) };
  const steps = (sessionSteps: number) => ({ sessionSteps, perLevel: 1000, cap: 10_000 });

  it('reminds at 19:00 while the session runs, when the next level is within 1,500 steps, with the steps left', () => {
    const planned = of(plan(ist.at(2026, 3, 10, 12), { session, steps: steps(1240) }), 'steps');
    expect(planned).toEqual([
      expect.objectContaining({ fireAt: ist.at(2026, 3, 10, 19), channel: 'collect', route: '/(tabs)/tasks', params: { steps: 760 } }),
    ]);
  });

  it('not without a session, without Health Connect, at the cap, or once 19:00 has passed', () => {
    const now = ist.at(2026, 3, 10, 12);
    expect(of(plan(now, { steps: steps(1240) }), 'steps')).toEqual([]);
    expect(of(plan(now, { session, steps: null }), 'steps')).toEqual([]);
    expect(of(plan(now, { session, steps: steps(10_000) }), 'steps')).toEqual([]);
    expect(of(plan(ist.at(2026, 3, 10, 19, 30), { session, steps: steps(1240) }), 'steps')).toEqual([]);
  });

  it('not when the session ends before 19:00', () => {
    const short = { startedAt: iso(ist.at(2026, 3, 9, 17)), endsAt: iso(ist.at(2026, 3, 10, 17)) };
    expect(of(plan(ist.at(2026, 3, 10, 12), { session: short, steps: steps(1240) }), 'steps')).toEqual([]);
  });
});

describe('boost', () => {
  const session = { startedAt: iso(ist.at(2026, 3, 10, 8)), endsAt: iso(ist.at(2026, 3, 11, 8)) };

  it('reminds at 14:00 once the session has run 2 h, while views are left today', () => {
    const planned = of(plan(ist.at(2026, 3, 10, 9), { session, boost: { usedToday: 1, dailyLimit: 3 } }), 'boost');
    expect(planned.map((n) => n.fireAt)).toEqual([ist.at(2026, 3, 10, 14)]);
    expect(planned[0]).toMatchObject({ channel: 'collect', route: '/(tabs)' });
  });

  it('not when today’s views are used up, when not offered (ad-free/VIP, no consent...), or without a session', () => {
    const now = ist.at(2026, 3, 10, 9);
    expect(of(plan(now, { session, boost: { usedToday: 3, dailyLimit: 3 } }), 'boost')).toEqual([]);
    expect(of(plan(now, { session, boost: null }), 'boost')).toEqual([]);
    expect(of(plan(now, { boost: { usedToday: 0, dailyLimit: 3 } }), 'boost')).toEqual([]);
  });

  it('on the session’s second day too (its views start again), and not before the session is 2 h old', () => {
    const late = { startedAt: iso(ist.at(2026, 3, 10, 13)), endsAt: iso(ist.at(2026, 3, 11, 13)) };
    const planned = of(plan(ist.at(2026, 3, 10, 13, 30), { session: late, boost: { usedToday: 0, dailyLimit: 3 } }), 'boost');
    expect(planned.map((n) => n.fireAt)).toEqual([]); // 14:00 today is too early, 14:00 tomorrow is after the end
    const long = { startedAt: iso(ist.at(2026, 3, 10, 10)), endsAt: iso(ist.at(2026, 3, 11, 15)) };
    const both = of(plan(ist.at(2026, 3, 10, 13), { session: long, boost: { usedToday: 3, dailyLimit: 3 } }), 'boost');
    expect(both.map((n) => n.fireAt)).toEqual([ist.at(2026, 3, 11, 14)]); // today used up; tomorrow starts at 0
  });
});

describe('daily limit and priority: all types', () => {
  it('ranks league over steps over boost over come back on one day', () => {
    // The 15th (Sunday): league 20:00, steps 19:00, boost 14:00; only the top two stay.
    const now = ist.at(2026, 3, 15, 10);
    const session = { startedAt: iso(ist.at(2026, 3, 15, 8)), endsAt: iso(ist.at(2026, 3, 16, 8)) };
    const planned = plan(now, {
      session,
      league: { weekEndsAt: new Date('2026-03-16T00:00:00Z') },
      steps: { sessionSteps: 1240, perLevel: 1000, cap: 10_000 },
      boost: { usedToday: 0, dailyLimit: 3 },
    }).filter((n) => n.fireAt < ist.at(2026, 3, 16));
    expect(planned.map((n) => n.type)).toEqual(['steps', 'league']); // in time order; boost dropped
  });

  it('keeps at most two a day, by priority: session end > streak > ... > come back', () => {
    // The 12th: session end (09:00 after quiet hours), streak "not started" at 20:00, come back at 19:00.
    const now = ist.at(2026, 3, 10, 12);
    const session = { startedAt: iso(ist.at(2026, 3, 11, 2)), endsAt: iso(ist.at(2026, 3, 12, 2)) };
    const planned = plan(now, { streak: noStreak, session });
    const onThe12th = planned.filter((n) => n.fireAt >= ist.at(2026, 3, 12) && n.fireAt < ist.at(2026, 3, 13));
    expect(onThe12th.map((n) => n.type)).toEqual(['sessionEnd', 'streak']);
    expect(onThe12th.length).toBe(DAILY_LIMIT);
    // Every day keeps the limit.
    const perDay = new Map<string, number>();
    for (const n of planned) {
      const key = n.fireAt.toISOString().slice(0, 10);
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    for (const count of perDay.values()) expect(count).toBeLessThanOrEqual(DAILY_LIMIT);
  });

  it('counts what was already shown today', () => {
    const now = ist.at(2026, 3, 10, 12);
    const shownToday = [{ type: 'sessionEnd' as const, fireAt: ist.at(2026, 3, 10, 9).getTime() }];
    const today = (sent = shownToday) => plan(now, { streak: noStreak }, ist.clock, sent).filter((n) => n.fireAt < ist.at(2026, 3, 11));
    expect(today([])).toHaveLength(1); // the 20:00 streak
    expect(today(shownToday.concat({ type: 'sessionEnd', fireAt: ist.at(2026, 3, 10, 10).getTime() }))).toHaveLength(0);
    // Pending entries from an earlier plan (not yet due) don't count: they're replaced.
    expect(today([{ type: 'sessionEnd', fireAt: ist.at(2026, 3, 10, 18).getTime() }])).toHaveLength(1);
  });

  it('leaves out a switched-off type', () => {
    const planned = plan(ist.at(2026, 3, 10, 12), { streak: noStreak }, ist.clock, [], { ...ALL_TYPES_ON, comeback: false });
    expect(of(planned, 'comeback')).toEqual([]);
    expect(of(planned, 'streak').length).toBeGreaterThan(0);
  });
});

describe('text variants', () => {
  it('stay the same within a day and move on the next day', () => {
    const a = plan(ist.at(2026, 3, 10, 8), { streak: noStreak });
    const b = plan(ist.at(2026, 3, 10, 15), { streak: noStreak });
    const streakA = of(a, 'streak');
    expect(of(b, 'streak')[0].textKey).toBe(streakA[0].textKey);
    expect(new Set(streakA.map((n) => n.textKey)).size).toBe(3); // three days, three variants
  });

  it('every variant exists in both languages, fills its placeholders and promises no money', () => {
    for (const [group, keys] of Object.entries(VARIANTS)) {
      for (const key of keys) {
        for (const lang of ['tr', 'en'] as const) {
          const params: Record<string, number> | undefined = group === 'streak' ? { count: 5, hours: 4 } : group === 'steps' ? { steps: 1200 } : undefined;
          const text = translate(lang, key as never, params);
          expect([key, text]).not.toEqual([key, key]);
          expect(text).not.toMatch(/\{\w+\}/);
          expect(text).not.toMatch(/para|nakit|money|cash|kazanç|earn money/i);
        }
      }
    }
  });
});
