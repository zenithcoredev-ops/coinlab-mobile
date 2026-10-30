import * as Notifications from 'expo-notifications';

import { translate } from '@/i18n/translate';
import type { Language } from '@/i18n/translate';
import { NOT_STARTED_DAYS, planStreakReminders, ReminderInput } from '@/lib/streak-reminder';
import { ensureStreakChannel, removeLegacyChannels, STREAK_CHANNEL_ID } from '@/services/notifications';

const STREAK_ID = 'streak-reminder';
const NOT_STARTED_IDS = Array.from({ length: NOT_STARTED_DAYS }, (_, i) => `streak-not-started-${i}`);

// Syncs and cancels run one at a time; interleaved, two syncs could each leave their own reminders.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

async function cancelAll() {
  await Promise.all(
    [STREAK_ID, ...NOT_STARTED_IDS].map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}

export function cancelStreakReminder() {
  return serialized(cancelAll);
}

/**
 * Replaces the pending streak reminders with ones matching the latest server state.
 * Always cancels first, so nothing stale is left pending.
 */
export function syncStreakReminder(state: ReminderInput | null, enabled: boolean, language: Language, now = new Date()) {
  return serialized(() => schedule(state, enabled, language, now));
}

async function schedule(state: ReminderInput | null, enabled: boolean, language: Language, now: Date) {
  await cancelAll();
  // Nothing is pending now, so no reminder can fire on a removed channel.
  await removeLegacyChannels();
  if (!enabled || !state) return;

  const reminders = planStreakReminders(now, state);
  if (reminders.length === 0) return;

  await ensureStreakChannel(language);
  let notStarted = 0;
  for (const reminder of reminders) {
    const isStreak = reminder.kind === 'streak';
    await Notifications.scheduleNotificationAsync({
      identifier: isStreak ? STREAK_ID : NOT_STARTED_IDS[notStarted++],
      content: {
        title: translate(language, 'reminder.title'),
        body: isStreak
          ? translate(language, 'streak.reminder', { count: state.streak, hours: reminder.hoursLeft })
          : translate(language, 'streak.notStarted'),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: STREAK_CHANNEL_ID },
    });
  }
}
