import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useMining } from '@/context/mining';
import { useI18n } from '@/i18n';
import { refreshWidgets } from '@/widget/refresh';
import { buildSnapshot } from '@/widget/snapshot';
import { updateTodaySteps } from '@/widget/steps';
import { publishSnapshot } from '@/widget/sync';

// While the app is open the widget's step count is kept fresh from here (no background permission needed).
const STEPS_INTERVAL_MS = 5 * 60_000;

async function refreshSteps() {
  if (await updateTodaySteps(new Date(), { background: false })) await refreshWidgets();
}

/** Mirrors the latest mining status, language and today's steps into the home-screen widget. */
export function useWidgetSync() {
  const { status, fetchedAt } = useMining();
  const { language } = useI18n();

  useEffect(() => {
    if (!status) return;
    publishSnapshot(buildSnapshot(status, language, fetchedAt || Date.now())).catch(() => {});
  }, [status, fetchedAt, language]);

  useEffect(() => {
    refreshSteps().catch(() => {});
    const id = setInterval(() => refreshSteps().catch(() => {}), STEPS_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshSteps().catch(() => {}));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
}
