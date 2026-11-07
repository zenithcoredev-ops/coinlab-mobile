import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SentEntry } from '@/lib/notification-plan';

const KEY = 'coinlab_notification_log';
/** Entries older than this can't affect a daily limit any more. */
const KEEP_MS = 8 * 24 * 60 * 60_000;

/**
 * What was scheduled, so a re-plan later the same day still counts the ones already shown toward
 * the daily limit. Pending entries are replaced on every plan; due ones are kept for a week.
 */
export async function loadNotificationLog(): Promise<SentEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as SentEntry[]) : [];
  } catch {
    return [];
  }
}

/** Keeps the entries already due (recent ones) and adds what was just scheduled. */
export function nextNotificationLog(previous: SentEntry[], scheduled: SentEntry[], now: number): SentEntry[] {
  return [...previous.filter((e) => e.fireAt <= now && now - e.fireAt < KEEP_MS), ...scheduled];
}

export async function saveNotificationLog(log: SentEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(log)).catch(() => {});
}
