import AsyncStorage from '@react-native-async-storage/async-storage';
import { RevenuePrecisions, type PaidEvent } from 'react-native-google-mobile-ads';

import { ApiError } from '@/services/api';
import { AdImpression, logAdImpression } from '@/services/ads-api';

const QUEUE_KEY = 'coinlab_ad_impressions';
/** Older entries are dropped beyond this (the queue is only a buffer for when the network is down). */
const MAX_QUEUED = 200;

export type AdFormat = 'interstitial' | 'rewarded';

function randomId(): string {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

/** The impression-level revenue of one shown ad, as POST /ads/impressions takes it. No user data. */
export function impressionFromPaidEvent(event: PaidEvent, adUnitId: string, format: AdFormat): AdImpression {
  const micros = event.valueMicros ?? String(Math.round(event.value * 1_000_000));
  return {
    clientEventId: randomId(),
    adUnitId,
    format,
    valueMicros: micros,
    currencyCode: event.currency,
    precision: RevenuePrecisions[event.precision] ?? 'UNKNOWN',
    adSourceName: event.responseInfo?.loadedAdapterResponse?.adSourceName ?? null,
    responseId: event.responseInfo?.responseId ?? null,
  };
}

async function readQueue(): Promise<AdImpression[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AdImpression[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: AdImpression[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUED))).catch(() => {});
}

/** Keeps the impression until it reaches the backend; the client event id makes resending safe. */
export async function recordImpression(impression: AdImpression): Promise<void> {
  await writeQueue([...(await readQueue()), impression]);
}

let flushing = false;

/**
 * Sends the queued impressions, oldest first. Stops at a network or server error (they stay for the
 * next try); drops one the server refuses outright (4xx, e.g. no endpoint yet), so it can't block the rest.
 */
export async function flushImpressions(token: string | null): Promise<void> {
  if (!token || flushing) return;
  flushing = true;
  try {
    let queue = await readQueue();
    while (queue.length) {
      try {
        await logAdImpression(token, queue[0]);
      } catch (e) {
        const refused = e instanceof ApiError && typeof e.status === 'number' && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429;
        if (!refused) break;
      }
      queue = queue.slice(1);
      await writeQueue(queue);
    }
  } finally {
    flushing = false;
  }
}
