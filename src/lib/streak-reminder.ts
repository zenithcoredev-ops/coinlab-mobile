// The server reports when the streak expires (midnight of the user's local day). Older servers
// don't, and then the streak resets at 00:00 UTC; the reminder is anchored to the user's own clock.
export const REMINDER_LOCAL_HOUR = 20;
export const NOT_STARTED_DAYS = 3;
const MIN_LEAD_MS = 60_000;
/** A reminder with less time than this left to save the streak isn't worth sending. */
const MIN_WINDOW_MS = 10 * 60_000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type ReminderInput = {
  /** Server streak. */
  streak: number;
  /** Whether a mining session already started today (UTC); only used without `streakExpiresAt`. */
  minedToday: boolean;
  /** ISO-8601; null when there's no streak. Undefined from servers that predate it. */
  streakExpiresAt?: string | null;
  /** The running session, if any. */
  session?: { startedAt: string; endsAt: string } | null;
};

/** The instant at `hour`:00 local time on the local day `dayOffset` days after `day`'s. */
export type LocalClock = (day: Date, dayOffset: number, hour: number) => Date;

/** Local time on this device; tests pass a clock for a named zone. */
export const deviceClock: LocalClock = (day, dayOffset, hour) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate() + dayOffset, hour);

export type PlannedReminder =
  | { kind: 'streak'; fireAt: Date; hoursLeft: number }
  | { kind: 'notStarted'; fireAt: Date };

export type StreakReminder = {
  fireAt: Date;
  /** Whole hours (rounded up, at least 1) from `fireAt` until the streak day ends at 00:00 UTC. */
  hoursLeft: number;
};

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function localReminderTime(day: Date, dayOffset: number): Date {
  return deviceClock(day, dayOffset, REMINDER_LOCAL_HOUR);
}

function hoursUntil(from: Date, to: number): number {
  return Math.max(1, Math.ceil((to - from.getTime()) / HOUR_MS));
}

function sessionCovers(session: ReminderInput['session'], at: Date): boolean {
  if (!session) return false;
  const t = at.getTime();
  return Date.parse(session.startedAt) <= t && t < Date.parse(session.endsAt);
}

/**
 * Every reminder that should be pending right now; the caller replaces whatever was scheduled.
 *
 * - Streak > 0: one reminder at 20:00 on the streak's last local day, unless that's already past or
 *   leaves under 10 minutes before it expires.
 * - No streak: "you haven't started mining today" at 20:00 on up to 3 consecutive days, skipping
 *   any day whose 20:00 falls inside the running session.
 * - Servers without `streakExpiresAt`: the UTC-day rule in `nextStreakReminder`.
 */
export function planStreakReminders(now: Date, input: ReminderInput, clock: LocalClock = deviceClock): PlannedReminder[] {
  const { streak, streakExpiresAt, session } = input;
  const expiresAt = streakExpiresAt ? Date.parse(streakExpiresAt) : NaN;

  if (streakExpiresAt === undefined || (streak > 0 && Number.isNaN(expiresAt))) {
    const legacy = nextStreakReminder(now, input);
    return legacy ? [{ kind: 'streak', ...legacy }] : [];
  }

  if (streak > 0) {
    const fireAt = clock(new Date(expiresAt - 1), 0, REMINDER_LOCAL_HOUR);
    if (fireAt.getTime() - now.getTime() < MIN_LEAD_MS) return [];
    if (expiresAt - fireAt.getTime() < MIN_WINDOW_MS) return [];
    // The server counts days a session covers as mined, so this shouldn't happen; never tell the
    // user to start mining while a session is running.
    if (sessionCovers(session, fireAt)) return [];
    return [{ kind: 'streak', fireAt, hoursLeft: hoursUntil(fireAt, expiresAt) }];
  }

  const first = clock(now, 0, REMINDER_LOCAL_HOUR).getTime() - now.getTime() < MIN_LEAD_MS ? 1 : 0;
  const reminders: PlannedReminder[] = [];
  for (let i = 0; i < NOT_STARTED_DAYS; i++) {
    const fireAt = clock(now, first + i, REMINDER_LOCAL_HOUR);
    if (!sessionCovers(session, fireAt)) reminders.push({ kind: 'notStarted', fireAt });
  }
  return reminders;
}

/**
 * When the next "your streak is about to end" notification should fire (20:00 device time), or
 * null if there's no streak to protect.
 *
 * Only fires on a UTC day with no mining yet:
 * - Not mined today: remind at the next 20:00 if it still falls on today's UTC day.
 * - Already mined today: remind at the next 20:00 that falls on a later UTC day. If the user opens
 *   the app and mines before then, the reminder is rescheduled.
 */
export function nextStreakReminder(now: Date, { streak, minedToday }: Pick<ReminderInput, 'streak' | 'minedToday'>): StreakReminder | null {
  if (streak <= 0) return null;

  const today = utcDayStart(now);
  for (let offset = 0; offset <= 2; offset++) {
    const fireAt = localReminderTime(now, offset);
    if (fireAt.getTime() - now.getTime() < MIN_LEAD_MS) continue;

    const fireDay = utcDayStart(fireAt);
    if (fireDay === today) {
      if (minedToday) continue;
    } else if (!minedToday) {
      // Today was missed, so the streak is already gone by then.
      return null;
    }
    return { fireAt, hoursLeft: hoursUntil(fireAt, fireDay + DAY_MS) };
  }
  return null;
}
