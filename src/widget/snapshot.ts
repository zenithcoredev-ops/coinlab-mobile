import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Language } from '@/i18n/translate';
import { liveBalanceAt } from '@/lib/mining-math';
import type { MiningStatus } from '@/services/mining-api';

const STORAGE_KEY = 'coinlab_widget_snapshot';

/**
 * What the home-screen widget shows, saved by the app each time mining status changes. The
 * widget never calls the API itself (no token handling in a background task); it renders from
 * this and extrapolates the countdown and balance from `savedAt`.
 */
export type WidgetSnapshot = {
  language: Language;
  /** Settled balance plus the running session's accrual, as of `savedAt`. */
  balance: number;
  ths: number;
  streak: number;
  /** Streak is alive but will lapse at 00:00 UTC unless the user mines today. */
  streakAtRisk: boolean;
  /** ISO-8601 UTC end of the running session; null when none is running. */
  endsAt: string | null;
  steps: number;
  /** Device time (ms) the snapshot was taken. */
  savedAt: number;
};

export function buildSnapshot(status: MiningStatus, language: Language, now = Date.now()): WidgetSnapshot {
  return {
    language,
    balance: liveBalanceAt(status, 0),
    ths: status.currentThs,
    streak: status.streak,
    streakAtRisk: status.streak > 0 && !status.streakMinedToday,
    endsAt: status.session ? status.session.endsAt : null,
    steps: status.session ? (status.todaySteps ?? 0) : 0,
    savedAt: now,
  };
}

export async function saveSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export async function loadSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}

export async function clearSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
