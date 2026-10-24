import type { StepsAvailability } from './health-connect.types';

// Health Connect is Android-only; elsewhere the step counter stays off.
export type { StepsAvailability } from './health-connect.types';

export async function getStepsAvailability(): Promise<StepsAvailability> {
  return 'unsupported';
}

export async function requestStepsPermission(): Promise<boolean> {
  return false;
}

export async function openHealthConnectStore(): Promise<void> {}

export async function readVerifiedSteps(_sinceIso: string): Promise<number> {
  return 0;
}
