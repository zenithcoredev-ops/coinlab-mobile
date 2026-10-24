// The streak resets at 00:00 UTC, but the reminder is anchored to the user's own clock.
export const REMINDER_LOCAL_HOUR = 20;
const MIN_LEAD_MS = 60_000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type ReminderInput = {
  /** Server streak (consecutive UTC days). */
  streak: number;
  /** Whether a mining session already started today (UTC). */
  minedToday: boolean;
};

export type StreakReminder = {
  fireAt: Date;
  /** Whole hours (rounded up, at least 1) from `fireAt` until the streak day ends at 00:00 UTC. */
  hoursLeft: number;
};

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function localReminderTime(day: Date, dayOffset: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + dayOffset, REMINDER_LOCAL_HOUR);
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
export function nextStreakReminder(now: Date, { streak, minedToday }: ReminderInput): StreakReminder | null {
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
    return { fireAt, hoursLeft: Math.max(1, Math.ceil((fireDay + DAY_MS - fireAt.getTime()) / HOUR_MS)) };
  }
  return null;
}
