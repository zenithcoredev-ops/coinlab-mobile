import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useMining } from '@/context/mining';
import { useI18n } from '@/i18n';
import { refreshWidgets } from '@/widget/refresh';
import { buildSnapshot } from '@/widget/snapshot';
import { updateTodaySteps } from '@/widget/steps';
import { publishSnapshot } from '@/widget/sync';
import { refreshWeatherInApp } from '@/widget/weather-sync';

// While the app is open the widget's steps and weather are kept fresh from here (no background
// permission needed for either; the weather itself is only fetched every 45 minutes).
const REFRESH_INTERVAL_MS = 5 * 60_000;

async function refreshWidgetData() {
  const [steps, weather] = await Promise.all([
    updateTodaySteps(new Date(), { background: false }),
    refreshWeatherInApp().catch(() => false),
  ]);
  if (steps || weather) await refreshWidgets();
}

/** Mirrors the latest mining status, language, today's steps and the weather into the home-screen widget. */
export function useWidgetSync() {
  const { status, fetchedAt } = useMining();
  const { language } = useI18n();

  useEffect(() => {
    if (!status) return;
    publishSnapshot(buildSnapshot(status, language, fetchedAt || Date.now())).catch(() => {});
  }, [status, fetchedAt, language]);

  useEffect(() => {
    refreshWidgetData().catch(() => {});
    const id = setInterval(() => refreshWidgetData().catch(() => {}), REFRESH_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshWidgetData().catch(() => {}));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
}
