import { useEffect } from 'react';

import { useMining } from '@/context/mining';
import { useI18n } from '@/i18n';
import { buildSnapshot } from '@/widget/snapshot';
import { publishSnapshot } from '@/widget/sync';

/** Mirrors the latest mining status and language into the home-screen widget. */
export function useWidgetSync() {
  const { status, fetchedAt } = useMining();
  const { language } = useI18n();

  useEffect(() => {
    if (!status) return;
    publishSnapshot(buildSnapshot(status, language, fetchedAt || Date.now())).catch(() => {});
  }, [status, fetchedAt, language]);
}
