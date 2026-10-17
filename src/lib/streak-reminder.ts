// The streak resets at 00:00 UTC, so the reminder is anchored to UTC too.
export const REMINDER_UTC_HOUR = 21;
const MIN_LEAD_MS = 60_000;

export type ReminderInput = {
  /** Server streak (consecutive UTC days). */
  streak: number;
  /** Whether a mining session already started today (UTC). */
  minedToday: boolean;
};

function reminderTimeOnDay(day: Date): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), REMINDER_UTC_HOUR));
}

/**
 * When the next "your streak is about to end" notification should fire, or null if
 * there's no streak to protect.
 *
 * - Not mined yet today: remind this evening (skipped if that moment has passed).
 * - Already mined today: the streak is safe until tomorrow, so remind tomorrow evening.
 *   If the user opens the app and mines before then, the reminder is rescheduled.
 */
export function nextStreakReminder(now: Date, { streak, minedToday }: ReminderInput): Date | null {
  if (streak <= 0) return null;

  const today = reminderTimeOnDay(now);
  if (!minedToday) {
    return today.getTime() - now.getTime() >= MIN_LEAD_MS ? today : null;
  }
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return tomorrow;
}
