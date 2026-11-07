import * as Notifications from 'expo-notifications';

import { translate } from '@/i18n/translate';
import type { Language } from '@/i18n/translate';
import type { PluralKey, TranslationKey } from '@/i18n/en';
import { ALL_NOTIFICATION_IDS, ALL_TYPES_ON, PlanInput, planNotifications, TypePrefs } from '@/lib/notification-plan';
import { loadNotificationLog, nextNotificationLog, saveNotificationLog } from '@/services/notification-log';
import { CHANNEL_IDS, ensureChannels, removeLegacyChannels } from '@/services/notifications';

/** Ids earlier builds used for the streak reminders; cancelled so nothing old fires. */
const LEGACY_IDS = ['streak-reminder', 'streak-not-started-0', 'streak-not-started-1', 'streak-not-started-2'];

// Syncs and cancels run one at a time; interleaved, two syncs could each leave their own notifications.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

async function cancelAll() {
  await Promise.all(
    [...ALL_NOTIFICATION_IDS, ...LEGACY_IDS].map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}

/** Cancels every pending notification (sign-out). */
export function cancelNotifications() {
  return serialized(cancelAll);
}

export type SyncOptions = {
  /** The user wants notifications and the OS allows them. */
  enabled: boolean;
  language: Language;
  prefs?: TypePrefs;
  now?: Date;
};

/**
 * Replaces the pending notifications with the plan for the latest state. Always cancels first, so
 * nothing stale is left pending.
 */
export function syncNotifications(input: PlanInput, { enabled, language, prefs = ALL_TYPES_ON, now = new Date() }: SyncOptions) {
  return serialized(() => schedule(input, enabled, language, prefs, now));
}

async function schedule(input: PlanInput, enabled: boolean, language: Language, prefs: TypePrefs, now: Date) {
  await cancelAll();
  // Nothing is pending now, so no notification can fire on a removed channel.
  await removeLegacyChannels();
  if (!enabled) return;

  const log = await loadNotificationLog();
  const planned = planNotifications(now, input, prefs, log);
  await saveNotificationLog(nextNotificationLog(log, planned.map((p) => ({ type: p.type, fireAt: p.fireAt.getTime() })), now.getTime()));
  if (planned.length === 0) return;

  await ensureChannels(language);
  for (const n of planned) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: {
        title: translate(language, 'reminder.title'),
        body: translate(language, n.textKey as TranslationKey | PluralKey, n.params),
        data: { route: n.route, type: n.type },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.fireAt, channelId: CHANNEL_IDS[n.channel] },
    });
  }
}
