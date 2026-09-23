import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '@/constants/config';

// The backend mounts an authenticated `/mining` router, but its routes and
// response shapes are not documented yet. Until they are confirmed, the app
// runs against the local mock below. Flip this once the endpoints exist.
export const USE_MOCK_MINING = true;

export const MINING_SESSION_MS = 24 * 60 * 60 * 1000;

export type MiningStatus = {
  /** True while a 24h session is running. */
  isActive: boolean;
  /** ISO timestamp; null when no session is running. */
  startedAt: string | null;
  /** ISO timestamp; null when no session is running. */
  endsAt: string | null;
  /** Settled CLB balance, excluding the running session's accrual. */
  balance: number;
  /** CLB earned per hour while a session is active. */
  pointsPerHour: number;
  /** Current mining speed in Th/s. */
  hashrateThs: number;
};

export class MiningApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

/** Balance including what the running session has earned so far. */
export function liveBalance(status: MiningStatus, now = Date.now()): number {
  if (!status.isActive || !status.startedAt || !status.endsAt) return status.balance;
  const start = Date.parse(status.startedAt);
  const end = Date.parse(status.endsAt);
  const elapsedMs = Math.max(0, Math.min(now, end) - start);
  return status.balance + (elapsedMs / 3_600_000) * status.pointsPerHour;
}

export function getMiningStatus(token: string): Promise<MiningStatus> {
  return USE_MOCK_MINING ? mockGetStatus() : request(token, 'GET', '/mining/status');
}

export function startMining(token: string): Promise<MiningStatus> {
  return USE_MOCK_MINING ? mockStart() : request(token, 'POST', '/mining/start');
}

async function request(token: string, method: 'GET' | 'POST', path: string): Promise<MiningStatus> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new MiningApiError(data?.error ?? `Istek basarisiz (${res.status})`, res.status);
  }
  return data as MiningStatus;
}

// --- Mock implementation -----------------------------------------------------
// Persisted in AsyncStorage so the countdown survives app reloads.

const MOCK_STORAGE_KEY = 'coinlab_mock_mining';
const MOCK_POINTS_PER_HOUR = 0.25;
const MOCK_HASHRATE_THS = 12.5;

const idleStatus: MiningStatus = {
  isActive: false,
  startedAt: null,
  endsAt: null,
  balance: 0,
  pointsPerHour: MOCK_POINTS_PER_HOUR,
  hashrateThs: 0,
};

async function readMock(): Promise<MiningStatus> {
  try {
    const raw = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? { ...idleStatus, ...JSON.parse(raw) } : idleStatus;
  } catch {
    return idleStatus;
  }
}

async function writeMock(status: MiningStatus) {
  await AsyncStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(status));
}

async function mockGetStatus(): Promise<MiningStatus> {
  const status = await readMock();
  if (status.isActive && status.endsAt && Date.parse(status.endsAt) <= Date.now()) {
    // Session finished: settle the earned points and go idle.
    const settled = { ...idleStatus, balance: liveBalance(status) };
    await writeMock(settled);
    return settled;
  }
  return status;
}

async function mockStart(): Promise<MiningStatus> {
  const current = await mockGetStatus();
  if (current.isActive) return current;
  const now = Date.now();
  const next: MiningStatus = {
    ...current,
    isActive: true,
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + MINING_SESSION_MS).toISOString(),
    hashrateThs: MOCK_HASHRATE_THS,
  };
  await writeMock(next);
  return next;
}
