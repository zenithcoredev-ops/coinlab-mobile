import { DailyTask, msUntilReset, TaskProgress, taskState } from '../tasks-api';

const base: DailyTask = { id: 'mine', reward: 0.05, progress: 0, target: 1, isComplete: false, claimed: false };

describe('taskState', () => {
  it('maps server flags to a UI state', () => {
    expect(taskState(base)).toBe('locked');
    expect(taskState({ ...base, isComplete: true })).toBe('ready');
    expect(taskState({ ...base, isComplete: true, claimed: true })).toBe('claimed');
  });
});

describe('msUntilReset', () => {
  const progress: TaskProgress = {
    serverTime: '2026-03-10T23:00:00Z',
    day: '2026-03-10',
    resetsAt: '2026-03-11T00:00:00Z',
    earnedToday: 0,
    tasks: [],
  };

  it('counts down from the server snapshot, not the device clock', () => {
    expect(msUntilReset(progress, 0)).toBe(3_600_000);
    expect(msUntilReset(progress, 600_000)).toBe(3_000_000);
  });

  it('never goes negative', () => {
    expect(msUntilReset(progress, 99_999_999)).toBe(0);
  });
});
