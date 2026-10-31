import { hasBackgroundStepsAccess, readTodaySteps } from '@/services/health-connect';
import { localDay, loadStoredSteps, stepsForToday, updateTodaySteps } from '../steps';
import { stepsRingSvg } from '../steps-ring';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/services/health-connect', () => ({ hasBackgroundStepsAccess: jest.fn(), readTodaySteps: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const access = hasBackgroundStepsAccess as jest.Mock;
const read = readTodaySteps as jest.Mock;
const morning = new Date(2026, 9, 30, 9, 0);
const MIN = 60_000;

beforeEach(async () => {
  await AsyncStorage.clear();
  access.mockReset().mockResolvedValue(true);
  read.mockReset().mockResolvedValue(6240);
});

describe('stepsForToday', () => {
  it('is null before any read, the count on the same day, and 0 once the day has changed', () => {
    expect(localDay(morning)).toBe('2026-10-30');
    expect(stepsForToday(null, morning)).toBeNull();
    expect(stepsForToday({ day: '2026-10-30', steps: 6240, readAt: 0 }, morning)).toBe(6240);
    expect(stepsForToday({ day: '2026-10-29', steps: 9000, readAt: 0 }, morning)).toBe(0);
  });
});

describe('updateTodaySteps', () => {
  it('reads and saves today\'s steps in the foreground, reporting a change', async () => {
    expect(await updateTodaySteps(morning, { background: false })).toBe(true);
    expect(await loadStoredSteps()).toEqual({ day: '2026-10-30', steps: 6240, readAt: morning.getTime() });
    expect(access).not.toHaveBeenCalled();
    expect(await updateTodaySteps(new Date(morning.getTime() + MIN), { background: false })).toBe(false); // same count
  });

  it('in the background needs the background permission', async () => {
    access.mockResolvedValue(false);
    expect(await updateTodaySteps(morning, { background: true })).toBe(false);
    expect(read).not.toHaveBeenCalled();
    expect(await loadStoredSteps()).toBeNull();
  });

  it('in the background reads at most every 10 minutes, but always on a new day', async () => {
    await updateTodaySteps(morning, { background: true });
    read.mockResolvedValue(7000);
    expect(await updateTodaySteps(new Date(morning.getTime() + 5 * MIN), { background: true })).toBe(false);
    expect(read).toHaveBeenCalledTimes(1);
    expect(await updateTodaySteps(new Date(morning.getTime() + 11 * MIN), { background: true })).toBe(true);
    expect(read).toHaveBeenCalledTimes(2);

    read.mockResolvedValue(120);
    const nextDay = new Date(2026, 9, 31, 0, 5);
    expect(await updateTodaySteps(nextDay, { background: true })).toBe(true);
    expect(stepsForToday(await loadStoredSteps(), nextDay)).toBe(120);
  });

  it('keeps the saved count when Health Connect fails', async () => {
    await updateTodaySteps(morning, { background: false });
    read.mockRejectedValue(new Error('SecurityException'));
    expect(await updateTodaySteps(new Date(morning.getTime() + 20 * MIN), { background: false })).toBe(false);
    expect((await loadStoredSteps())?.steps).toBe(6240);
  });
});

describe('stepsRingSvg', () => {
  const arc = (svg: string) => svg.match(/stroke-dasharray="([\d.]+) ([\d.]+)"/);
  it('fills the arc in proportion, capped at a full ring', () => {
    const half = arc(stepsRingSvg(0.5))!;
    expect(Number(half[1]) / Number(half[2])).toBeCloseTo(0.5);
    const over = arc(stepsRingSvg(1.7))!;
    expect(Number(over[1])).toBeCloseTo(Number(over[2]));
    expect(arc(stepsRingSvg(0))).toBeNull(); // just the track
  });
});
