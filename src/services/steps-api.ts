import { apiRequest } from '@/services/api';

/** Mirrors the backend: the speed bonus stops growing at this many steps per session. */
export const STEP_BONUS_CAP_STEPS = 10_000;
/** Mirrors the backend: steps per bonus level. */
export const STEPS_PER_BONUS_UNIT = 1000;

export type StepSyncResult = {
  /** Steps the server accepted for the running session (may be lower than reported). */
  todaySteps: number;
  /** Th/s the steps currently add to mining speed. */
  bonusThs: number;
  capReached: boolean;
  /** Steps left until the next bonus level; null at the cap. */
  stepsToNextBonus: number | null;
  clamped: boolean;
};

export type StepErrorCode = 'no_active_session' | 'invalid_steps' | 'invalid_source' | 'conflict';

/** Reports the absolute step total since the mining session began; the server decides the reward. */
export function syncSteps(token: string, steps: number): Promise<StepSyncResult> {
  return apiRequest(token, 'POST', '/steps/sync', { steps, source: 'health_connect' });
}
