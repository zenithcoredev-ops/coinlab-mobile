import { clbPerSecond } from '@/lib/mining-math';
import { isSignedOut, StoredWidget, WidgetSnapshot } from './snapshot';

export type WidgetState = 'signedOut' | 'idle' | 'active' | 'finished';

export type WidgetModel = {
  state: WidgetState;
  language: WidgetSnapshot['language'];
  balance: number;
  ths: number;
  streak: number;
  streakAtRisk: boolean;
  /** Health Connect steps today (local day); null hides the steps ring. */
  stepsToday: number | null;
  remainingMs: number;
};

/** Nothing saved yet (just added): invite the user to start mining rather than draw nothing. */
const noSnapshot = (language: WidgetSnapshot['language']): WidgetModel => ({
  state: 'idle',
  language,
  balance: 0,
  ths: 0,
  streak: 0,
  streakAtRisk: false,
  stepsToday: null,
  remainingMs: 0,
});

/** Turns what the app saved into what to draw at `now`, extrapolating time-dependent values. */
export function buildWidgetModel(
  stored: StoredWidget | null,
  now: number,
  fallbackLanguage: WidgetSnapshot['language'] = 'en',
  stepsToday: number | null = null
): WidgetModel {
  if (!stored) return { ...noSnapshot(fallbackLanguage), stepsToday };
  if (isSignedOut(stored)) return { ...noSnapshot(stored.language ?? fallbackLanguage), state: 'signedOut' };
  const snapshot = stored;
  const base = {
    language: snapshot.language,
    ths: snapshot.ths,
    streak: snapshot.streak,
    streakAtRisk: snapshot.streakAtRisk,
    stepsToday,
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
