import { apiRequest } from '@/services/api';

export type TaskId = 'mine' | 'friend';
export type TaskErrorCode = 'unknown_task' | 'not_complete' | 'already_claimed';

export type DailyTask = {
  id: string;
  /** CLB granted on claim; paid by the server. */
  reward: number;
  progress: number;
  target: number;
  isComplete: boolean;
  claimed: boolean;
};

export type TaskProgress = {
  /** ISO-8601 UTC. */
  serverTime: string;
  /** Current UTC day, `YYYY-MM-DD`. */
  day: string;
  /** ISO-8601 UTC; the next 00:00 UTC, when every task resets. */
  resetsAt: string;
  earnedToday: number;
  tasks: DailyTask[];
};

export type ClaimResult = { ok: true; reward: number; balance: string };

export function getTasks(token: string): Promise<TaskProgress> {
  return apiRequest(token, 'GET', '/tasks');
}

export function claimTask(token: string, taskId: string): Promise<ClaimResult> {
  return apiRequest(token, 'POST', `/tasks/${taskId}/claim`);
}

export type TaskState = 'locked' | 'ready' | 'claimed';

export function taskState(task: DailyTask): TaskState {
  if (task.claimed) return 'claimed';
  return task.isComplete ? 'ready' : 'locked';
}

/** Milliseconds until the daily reset, counted from when the snapshot was taken. */
export function msUntilReset(progress: TaskProgress, sinceFetchMs: number): number {
  const left = Date.parse(progress.resetsAt) - Date.parse(progress.serverTime) - Math.max(0, sinceFetchMs);
  return Math.max(0, left);
}
