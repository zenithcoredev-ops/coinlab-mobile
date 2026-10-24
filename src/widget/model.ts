import { clbPerSecond } from '@/lib/mining-math';
import type { WidgetSnapshot } from './snapshot';

export type WidgetState = 'signedOut' | 'idle' | 'active' | 'finished';

export type WidgetModel = {
  state: WidgetState;
  language: WidgetSnapshot['language'];
  balance: number;
  ths: number;
  streak: number;
  streakAtRisk: boolean;
  steps: number;
  remainingMs: number;
};

/** Nothing saved yet (just added, or signed out): invite the user to start mining rather than draw nothing. */
const noSnapshot = (language: WidgetSnapshot['language']): WidgetModel => ({
  state: 'idle',
  language,
  balance: 0,
  ths: 0,
  streak: 0,
  streakAtRisk: false,
  steps: 0,
  remainingMs: 0,
});

/** Turns the saved snapshot into what to draw at `now`, extrapolating time-dependent values. */
export function buildWidgetModel(
  snapshot: WidgetSnapshot | null,
  now: number,
  fallbackLanguage: WidgetSnapshot['language'] = 'en'
): WidgetModel {
  if (!snapshot) return noSnapshot(fallbackLanguage);
  const base = {
    language: snapshot.language,
    ths: snapshot.ths,
    streak: snapshot.streak,
    streakAtRisk: snapshot.streakAtRisk,
    steps: snapshot.steps,
  };
  if (!snapshot.endsAt) return { ...base, state: 'idle', balance: snapshot.balance, remainingMs: 0 };

  const endsAt = Date.parse(snapshot.endsAt);
  const accruingMs = Math.max(0, Math.min(now, endsAt) - snapshot.savedAt);
  const balance = snapshot.balance + (accruingMs / 1000) * clbPerSecond(snapshot.ths);
  const remainingMs = Math.max(0, endsAt - now);
  return { ...base, state: remainingMs > 0 ? 'active' : 'finished', balance, remainingMs };
}

/** Whole hours and minutes left; the widget only refreshes every few minutes, so no seconds. */
export function splitRemaining(ms: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
