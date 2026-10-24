import * as Notifications from 'expo-notifications';

import { translate } from '@/i18n/translate';
import type { Language } from '@/i18n/translate';
import { nextStreakReminder, ReminderInput } from '@/lib/streak-reminder';
import { ANDROID_CHANNEL_ID } from '@/services/notifications';

const REMINDER_ID = 'streak-reminder';

export async function cancelStreakReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
}

/**
 * Replaces the pending streak reminder with one matching the latest server state.
 * Always cancels first, so there is never more than one pending reminder.
 */
export async function syncStreakReminder(
  state: ReminderInput | null,
  enabled: boolean,
  language: Language,
  now = new Date()
) {
  await cancelStreakReminder();
  if (!enabled || !state) return;

  const reminder = nextStreakReminder(now, state);
  if (!reminder) return;

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: translate(language, 'reminder.title'),
      body: translate(language, 'streak.reminder', { count: state.streak, hours: reminder.hoursLeft }),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: ANDROID_CHANNEL_ID },
  });
}
