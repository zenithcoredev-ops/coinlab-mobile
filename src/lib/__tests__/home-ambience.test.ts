import { framedImageRect } from '../home-visuals';
import {
  FLAG,
  flagPulse,
  LOOP_S,
  PATH,
  PATH_PERIOD_S,
  PATH_RUN_S,
  pathLight,
  pathOnScreen,
  pointAlong,
  SKY,
  STAR_GROUP_PERIODS_S,
  starField,
  twinkle,
} from '../home-ambience';
import { HOME_BACKGROUND_FRAMING } from '@/components/home/backgrounds';
import { RING_SIZE } from '@/components/home/collect-ring';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// The Collect picture as the screen places it (1056x2208, ring centre at about y=300 on a 390 dp phone).
const RING_Y = 300;
const rect = framedImageRect(390, RING_Y, 2208 / 1056, HOME_BACKGROUND_FRAMING);

describe('home ambience geometry', () => {
  it('the path runs from the tents up to the peak, and the flag sits at the framing anchor', () => {
    expect(PATH[0].y).toBeGreaterThan(0.8); // the tents, low in the picture
    expect(PATH[PATH.length - 1].y).toBeLessThan(0.25); // the peak
    for (let i = 1; i < PATH.length; i++) expect(PATH[i].y).toBeLessThan(PATH[i - 1].y);
    // The flag is where the framing puts the ring's centre, give or take.
    expect(Math.abs(FLAG.y - HOME_BACKGROUND_FRAMING.anchorY)).toBeLessThan(0.02);
  });

  it('places the light along the path at an even pace, from the camp to the peak', () => {
    const p = pathOnScreen(rect);
    expect(pointAlong(p.xs, p.ys, p.along, 0)).toEqual({ x: p.xs[0], y: p.ys[0] });
    const end = pointAlong(p.xs, p.ys, p.along, 1);
    expect(end.x).toBeCloseTo(p.xs[p.xs.length - 1]);
    expect(end.y).toBeCloseTo(p.ys[p.ys.length - 1]);
    const mid = pointAlong(p.xs, p.ys, p.along, 0.5);
    expect(mid.y).toBeLessThan(p.ys[0]);
    expect(mid.y).toBeGreaterThan(end.y);
  });

  it('the light climbs once per period, then is gone, and fades out before the collecting ring', () => {
    const p = pathOnScreen(rect);
    const ring = { x: 195, y: RING_Y, radius: RING_SIZE / 2 };
    expect(pathLight(0, p.xs, p.ys, p.along, ring).opacity).toBe(0);
    const climbing = pathLight(PATH_RUN_S * 0.4, p.xs, p.ys, p.along, ring);
    expect(climbing.opacity).toBeGreaterThan(0);
    expect(climbing.opacity).toBeLessThanOrEqual(0.55);
    expect(pathLight(PATH_RUN_S + 0.5, p.xs, p.ys, p.along, ring).opacity).toBe(0);
    for (let t = 0; t < PATH_RUN_S; t += 0.05) {
      const l = pathLight(t, p.xs, p.ys, p.along, ring);
      if (Math.hypot(l.x - ring.x, l.y - ring.y) < ring.radius + 4) expect(l.opacity).toBe(0);
    }
  });

  it('every period divides the loop, so it repeats without a jump', () => {
    for (const period of [PATH_PERIOD_S, ...STAR_GROUP_PERIODS_S, 3]) expect(Number.isInteger(LOOP_S / period)).toBe(true);
    for (const period of STAR_GROUP_PERIODS_S) expect(period >= 2 && period <= 5).toBe(true);
  });

  it('stars: 15-25 of them, in the sky, a little apart, faint and never fully off', () => {
    const stars = starField();
    expect(stars.length).toBeGreaterThanOrEqual(15);
    expect(stars.length).toBeLessThanOrEqual(25);
    for (const s of stars) {
      expect(s.x >= SKY.x0 && s.x <= SKY.x1 && s.y >= SKY.y0 && s.y <= SKY.y1).toBe(true);
      expect(s.r).toBeLessThan(2);
    }
    expect(starField()).toEqual(stars);
    for (let t = 0; t < 10; t += 0.1) {
      const o = twinkle(t, 3, 0.2);
      expect(o).toBeGreaterThanOrEqual(0.12);
      expect(o).toBeLessThanOrEqual(0.55);
    }
  });

  it('the flag glow only swells a little', () => {
    for (let t = 0; t < 6; t += 0.1) {
      const p = flagPulse(t);
      expect(p.opacity).toBeLessThanOrEqual(0.24);
      expect(p.scale).toBeLessThanOrEqual(1.18);
    }
  });
});
