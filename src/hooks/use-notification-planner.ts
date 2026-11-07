import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useMining } from '@/context/mining';
import { useNotifications } from '@/context/notifications';
import { useI18n } from '@/i18n';
import { syncNotifications } from '@/services/notification-scheduler';

/**
 * Keeps the pending local notifications in step with the latest state: re-planned on opening the
 * app, on every return to it, when the session starts or ends, when the status changes, and when
 * the language or the user's choice changes. "Come back" reminders count from the last of these.
 */
export function useNotificationPlanner() {
  const { status } = useMining();
  const { active } = useNotifications();
  const { language } = useI18n();
  const [foregrounds, setForegrounds] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setForegrounds((n) => n + 1));
    return () => sub.remove();
  }, []);

  const streak = status?.streak;
  const minedToday = status?.streakMinedToday;
  const streakExpiresAt = status?.streakExpiresAt;
  const streakAtExpiry = status?.streakAtExpiry;
  const startedAt = status?.session?.startedAt;
  const endsAt = status?.session?.endsAt;

  useEffect(() => {
    if (streak === undefined || minedToday === undefined) return;
    const session = startedAt && endsAt ? { startedAt, endsAt } : null;
    syncNotifications(
      { streak: { streak, minedToday, streakExpiresAt, streakAtExpiry, session }, session },
      { enabled: active, language }
    ).catch(() => {});
  }, [streak, minedToday, streakExpiresAt, streakAtExpiry, startedAt, endsAt, active, language, foregrounds]);
}
