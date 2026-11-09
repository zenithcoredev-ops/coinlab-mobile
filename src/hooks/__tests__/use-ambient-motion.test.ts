import { motionAllowed } from '../use-ambient-motion';

jest.mock('expo-battery', () => ({ useLowPowerMode: () => false }));
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

describe('motionAllowed', () => {
  const on = { focused: true, appActive: true, reduceMotion: false, lowPower: false };

  it('runs only while the screen is on view and the app is in front', () => {
    expect(motionAllowed(on)).toBe(true);
    expect(motionAllowed({ ...on, focused: false })).toBe(false);
    expect(motionAllowed({ ...on, appActive: false })).toBe(false);
  });

  it('stops for "reduce motion" and for low-power / battery-saver mode', () => {
    expect(motionAllowed({ ...on, reduceMotion: true })).toBe(false);
    expect(motionAllowed({ ...on, lowPower: true })).toBe(false);
  });
});
