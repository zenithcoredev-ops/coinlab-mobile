import { stepsProgress, verifiedSteps } from '../health-steps';

describe('verifiedSteps', () => {
  it('returns the aggregate when nothing was typed in by hand', () => {
    expect(verifiedSteps(4200, [{ count: 4200, metadata: { recordingMethod: 2 } }, { count: 10 }])).toBe(4200);
  });

  it('subtracts manual entries (recording method 3)', () => {
    const records = [{ count: 3000, metadata: { recordingMethod: 2 } }, { count: 5000, metadata: { recordingMethod: 3 } }];
    expect(verifiedSteps(8000, records)).toBe(3000);
  });

  it('never goes negative and ignores fractions', () => {
    expect(verifiedSteps(100, [{ count: 500, metadata: { recordingMethod: 3 } }])).toBe(0);
    expect(verifiedSteps(1234.9, [])).toBe(1234);
  });
});

describe('stepsProgress', () => {
  it('clamps to 0..1', () => {
    expect(stepsProgress(5000, 10000)).toBe(0.5);
    expect(stepsProgress(20000, 10000)).toBe(1);
    expect(stepsProgress(-5, 10000)).toBe(0);
    expect(stepsProgress(5, 0)).toBe(0);
  });
});
