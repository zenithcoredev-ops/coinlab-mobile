import { Linking } from 'react-native';
import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { StepRecord, verifiedSteps } from '@/lib/health-steps';
import type { StepsAvailability } from './health-connect.types';

export type { StepsAvailability } from './health-connect.types';

const STEPS_READ = { accessType: 'read', recordType: 'Steps' } as const;
// READ_HEALTH_DATA_IN_BACKGROUND: lets the home-screen widget read steps while the app is closed.
const BACKGROUND_READ = { accessType: 'read', recordType: 'BackgroundAccessPermission' } as const;
const HEALTH_CONNECT_STORE_URL =
  'market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding';
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export async function getStepsAvailability(): Promise<StepsAvailability> {
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'not_installed';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update_required';
    if (!(await initialize())) return 'unsupported';
    const granted = await getGrantedPermissions();
    return granted.some((p) => 'recordType' in p && p.recordType === 'Steps' && p.accessType === 'read')
      ? 'ready'
      : 'needs_permission';
  } catch {
    return 'unsupported';
  }
}

const isGranted = (granted: { recordType?: string }[], recordType: string) =>
  granted.some((p) => 'recordType' in p && p.recordType === recordType);

/**
 * Shows the system permission sheet; resolves true when step reading was allowed. Background
 * reading (for the widget) is asked in the same sheet and is optional.
 */
export async function requestStepsPermission(): Promise<boolean> {
  try {
    await initialize();
    return isGranted(await requestPermission([STEPS_READ, BACKGROUND_READ]), 'Steps');
  } catch {
    return false;
  }
}

/** Whether steps may also be read while the app isn't open (Android 14+, or a recent Health Connect). */
export async function hasBackgroundStepsAccess(): Promise<boolean> {
  try {
    if (!(await initialize())) return false;
    return isGranted(await getGrantedPermissions(), 'BackgroundAccessPermission');
  } catch {
    return false;
  }
}

/** For users who allowed steps before background reading was asked for. */
export async function requestBackgroundStepsAccess(): Promise<boolean> {
  try {
    await initialize();
    return isGranted(await requestPermission([BACKGROUND_READ]), 'BackgroundAccessPermission');
  } catch {
    return false;
  }
}

/** Every step recorded today (device local day), as Health Connect totals them across apps. */
export async function readTodaySteps(now = new Date()): Promise<number> {
  await initialize();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const { COUNT_TOTAL } = await aggregateRecord({
    recordType: 'Steps',
    timeRangeFilter: { operator: 'between', startTime: midnight.toISOString(), endTime: now.toISOString() },
  });
  return COUNT_TOTAL ?? 0;
}

/** Opens the Play Store page of Health Connect (install or update). */
export function openHealthConnectStore(): Promise<void> {
  return Linking.openURL(HEALTH_CONNECT_STORE_URL).catch(() => {});
}

/** Reward-eligible steps recorded from `sinceIso` until now (manual entries excluded). */
export async function readVerifiedSteps(sinceIso: string): Promise<number> {
  const timeRangeFilter = { operator: 'between', startTime: sinceIso, endTime: new Date().toISOString() } as const;
  const { COUNT_TOTAL } = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });

  const records: StepRecord[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await readRecords('Steps', { timeRangeFilter, pageSize: PAGE_SIZE, pageToken });
    records.push(...res.records.map((r) => ({ count: r.count, metadata: r.metadata })));
    pageToken = res.pageToken;
    if (!pageToken) break;
  }
  return verifiedSteps(COUNT_TOTAL ?? 0, records);
}
