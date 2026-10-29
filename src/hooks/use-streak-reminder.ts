import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useMining } from '@/context/mining';
import { useNotifications } from '@/context/notifications';
import { useI18n } from '@/i18n';
import { syncStreakReminder } from '@/services/streak-reminder';

/** Keeps the pending local reminders in step with the server's streak state, language and settings. */
export function useStreakReminder() {
  const { status } = useMining();
  const { active } = useNotifications();
  const { language } = useI18n();
  // Rebuilt on every return to the app too, so the "not started" days roll forward.
  const [foregrounds, setForegrounds] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setForegrounds((n) => n + 1));
    return () => sub.remove();
  }, []);

  const streak = status?.streak;
  const minedToday = status?.streakMinedToday;
  const streakExpiresAt = status?.streakExpiresAt;
  const startedAt = status?.session?.startedAt;
  const endsAt = status?.session?.endsAt;

  useEffect(() => {
    if (streak === undefined || minedToday === undefined) return;
    const session = startedAt && endsAt ? { startedAt, endsAt } : null;
    syncStreakReminder({ streak, minedToday, streakExpiresAt, session }, active, language).catch(() => {});
  }, [streak, minedToday, streakExpiresAt, startedAt, endsAt, active, language, foregrounds]);
}
