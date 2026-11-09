import { contourPaths, leagueCardInfo, ringContours, ringGeometry, SPARK_COUNT, sparkFrame, tasksSummary, wobblyLoop } from '../home-visuals';

describe('ringGeometry', () => {
  it('starts at the top and goes clockwise', () => {
    const empty = ringGeometry(200, 10, 0);
    expect(empty.r).toBe(95);
    expect(empty.dashOffset).toBeCloseTo(empty.circumference);
    expect(empty.tip.x).toBeCloseTo(100);
    expect(empty.tip.y).toBeCloseTo(5);

    const quarter = ringGeometry(200, 10, 0.25);
    expect(quarter.tip.x).toBeCloseTo(195); // right side
    expect(quarter.tip.y).toBeCloseTo(100);
    expect(quarter.dashOffset).toBeCloseTo(quarter.circumference * 0.75);
  });

  it('clamps progress and survives bad numbers', () => {
    expect(ringGeometry(200, 10, 2).dashOffset).toBeCloseTo(0);
    expect(ringGeometry(200, 10, -1).dashOffset).toBeCloseTo(ringGeometry(200, 10, 0).circumference);
    expect(ringGeometry(200, 10, NaN).dashOffset).toBeCloseTo(ringGeometry(200, 10, 0).circumference);
  });
});

describe('sparkFrame', () => {
  const angleOf = (x: number, y: number) => Math.atan2(y - 100, x - 100);

  it('keeps every spark behind the tip, fading and shrinking as it ages', () => {
    const tipAngle = 0.4;
    for (let i = 0; i < SPARK_COUNT; i++) {
      for (const t of [0, 0.1, 0.33, 0.5, 0.77, 0.99]) {
        const f = sparkFrame(i, t, tipAngle, 90, 100);
        let behind = tipAngle - angleOf(f.x, f.y);
        behind = ((behind % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        expect(behind).toBeLessThan(0.25); // never ahead, never far behind
        expect(f.opacity).toBeGreaterThanOrEqual(0);
        expect(f.opacity).toBeLessThanOrEqual(0.9);
        expect(f.size).toBeGreaterThan(0);
      }
    }
    const young = sparkFrame(0, 0.05, tipAngle, 90, 100);
    const old = sparkFrame(0, 0.9, tipAngle, 90, 100);
    expect(old.opacity).toBeLessThan(young.opacity);
    expect(old.size).toBeLessThan(young.size);
  });

  it('uses only a few sparks', () => {
    expect(SPARK_COUNT).toBeLessThanOrEqual(8);
  });
});

describe('background lines', () => {
  it('are drawn the same way every time and fit the size', () => {
    const a = contourPaths(390, 1200);
    expect(a.length).toBeGreaterThan(8);
    expect(contourPaths(390, 1200)).toEqual(a);
    expect(contourPaths(0, 100)).toEqual([]);
    expect(a.every((d) => d.startsWith('M') && d.endsWith('Z'))).toBe(true);
  });

  it('puts three turquoise loops around the ring, outside it', () => {
    const loops = ringContours({ x: 200, y: 300 }, 100);
    expect(loops).toHaveLength(3);
    const xs = loops[0].match(/[ML](-?[\d.]+) /g)!.map((m) => parseFloat(m.slice(1)));
    expect(Math.min(...xs)).toBeLessThan(200 - 100);
    expect(wobblyLoop({ x: 0, y: 0 }, 10, 0, 0, 4)).toBe('M10.0 0.0 L0.0 8.2 L-10.0 0.0 L-0.0 -8.2 L10.0 -0.0 Z');
  });
});

describe('leagueCardInfo', () => {
  it('knows nothing before the league was loaded once', () => {
    expect(leagueCardInfo(null, 10, 9)).toEqual({ kind: 'unknown' });
    expect(leagueCardInfo({}, 10, 9)).toEqual({ kind: 'unknown' });
  });

  it('says how much is left to join a league', () => {
    expect(leagueCardInfo({ state: 'locked', entryRequired: 30 }, 12.5, 9)).toEqual({ kind: 'locked', missing: 17.5 });
    expect(leagueCardInfo({ state: 'locked', entryRequired: 30 }, 40, 9)).toEqual({ kind: 'locked', missing: 0 });
  });

  it('counts the places to promotion (or to the tournament in the top league)', () => {
    expect(leagueCardInfo({ state: 'active', league: 0, rank: 12, promoteCount: 9 }, 0, 9)).toEqual({
      kind: 'active',
      league: 0,
      rank: 12,
      toPromotion: 3,
      isDiamond: false,
    });
    expect(leagueCardInfo({ state: 'active', league: 0, rank: 4, promoteCount: 9 }, 0, 9)).toMatchObject({ toPromotion: 0 });
    expect(leagueCardInfo({ state: 'active', league: 9, rank: 10, promoteCount: 0, tournamentCount: 8 }, 0, 9)).toMatchObject({ toPromotion: 2, isDiamond: true });
    expect(leagueCardInfo({ state: 'active', league: 3, rank: null, promoteCount: 9 }, 0, 9)).toMatchObject({ rank: null, toPromotion: null });
    expect(leagueCardInfo({ state: 'tournament' }, 0, 9)).toEqual({ kind: 'tournament' });
  });
});

describe('tasksSummary', () => {
  const task = (id: string, done: boolean, claimed = false) => ({ id, isComplete: done, claimed });

  it('counts done tasks and picks the first open one', () => {
    const s = tasksSummary([task('mine', true, true), task('friend', true), task('steps', false)]);
    expect(s).toMatchObject({ done: 2, total: 3 });
    expect(s.progress).toBeCloseTo(2 / 3);
    expect(s.next?.id).toBe('steps');
  });

  it('handles no tasks and all done', () => {
    expect(tasksSummary([])).toEqual({ done: 0, total: 0, progress: 0, next: null });
    expect(tasksSummary([task('mine', true, true)]).next).toBeNull();
  });
});
