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

/** Shows the system permission sheet; resolves true when step reading was allowed. */
export async function requestStepsPermission(): Promise<boolean> {
  try {
    await initialize();
    const granted = await requestPermission([STEPS_READ]);
    return granted.some((p) => 'recordType' in p && p.recordType === 'Steps');
  } catch {
    return false;
  }
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
