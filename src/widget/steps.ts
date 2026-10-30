import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasBackgroundStepsAccess, readTodaySteps } from '@/services/health-connect';

// Kept apart from the mining snapshot: the widget's own background run updates it too.
const STORAGE_KEY = 'coinlab_widget_steps';
/** Health Connect is read at most this often, however many widgets ask. */
const MIN_READ_GAP_MS = 10 * 60_000;
export const STEP_GOAL = 10_000;

export type StoredSteps = {
  /** Device-local day the count belongs to, YYYY-MM-DD. */
  day: string;
  steps: number;
  /** Device time (ms) of the read. */
  readAt: number;
};

export function localDay(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export async function loadStoredSteps(): Promise<StoredSteps | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSteps) : null;
  } catch {
    return null;
  }
}

/**
 * Today's steps for the widget: null when never read (no Health Connect access: no ring), 0 when the
 * last read was on an earlier day.
 */
export function stepsForToday(stored: StoredSteps | null, now: Date): number | null {
  if (!stored) return null;
  return stored.day === localDay(now) ? stored.steps : 0;
}

/**
 * Reads today's steps from Health Connect and saves them; resolves whether the saved value changed.
 * In the background this needs the background-read permission, and never runs more than every
 * 10 minutes. Any failure (no permission, Health Connect missing) leaves the saved value alone.
 */
export async function updateTodaySteps(now: Date, { background }: { background: boolean }): Promise<boolean> {
  try {
    const stored = await loadStoredSteps();
    if (background) {
      if (stored && stored.day === localDay(now) && now.getTime() - stored.readAt < MIN_READ_GAP_MS) return false;
      if (!(await hasBackgroundStepsAccess())) return false;
    }
    const steps = await readTodaySteps(now);
    const next: StoredSteps = { day: localDay(now), steps, readAt: now.getTime() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return stepsForToday(stored, now) !== steps;
  } catch {
    return false;
  }
}
