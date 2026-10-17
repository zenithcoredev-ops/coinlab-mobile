import { useEffect } from 'react';

import { useMining } from '@/context/mining';
import { useNotifications } from '@/context/notifications';
import { useI18n } from '@/i18n';
import { syncStreakReminder } from '@/services/streak-reminder';

/** Keeps the pending local reminder in step with the server's streak state, language and settings. */
export function useStreakReminder() {
  const { status } = useMining();
  const { active } = useNotifications();
  const { language } = useI18n();

  const streak = status?.streak;
  const minedToday = status?.streakMinedToday;

  useEffect(() => {
    if (streak === undefined || minedToday === undefined) return;
    syncStreakReminder({ streak, minedToday }, active, language).catch(() => {});
  }, [streak, minedToday, active, language]);
}
