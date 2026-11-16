/**
 * Where the Collect picture's details are (as fractions of the picture: 0,0 top-left, 1,1 bottom-right),
 * measured on assets/backgrounds/home-bg.webp, and the timing of the small animations drawn over them:
 * a few twinkling stars in the sky, a soft light running up the neon path, a faint pulse at the flag.
 * Pure helpers so they can be tested; the timing ones are worklets (they run on the UI thread).
 */

export type Frac = { x: number; y: number };
export type Rect = { left: number; top: number; width: number; height: number };

/** The neon path from the tents up to the peak, as measured (camp first). */
export const PATH: readonly Frac[] = [
  { x: 0.645, y: 0.812 },
  { x: 0.517, y: 0.762 },
  { x: 0.472, y: 0.737 },
  { x: 0.486, y: 0.712 },
  { x: 0.558, y: 0.687 },
  { x: 0.554, y: 0.662 },
  { x: 0.626, y: 0.637 },
  { x: 0.676, y: 0.612 },
  { x: 0.744, y: 0.587 },
  { x: 0.693, y: 0.562 },
  { x: 0.656, y: 0.537 },
  { x: 0.705, y: 0.512 },
  { x: 0.658, y: 0.487 },
  { x: 0.612, y: 0.462 },
  { x: 0.633, y: 0.437 },
  { x: 0.58, y: 0.412 },
  { x: 0.547, y: 0.387 },
  { x: 0.599, y: 0.362 },
  { x: 0.631, y: 0.337 },
  { x: 0.599, y: 0.312 },
  { x: 0.575, y: 0.287 },
  { x: 0.536, y: 0.262 },
  { x: 0.517, y: 0.245 },
];

/** The gold flag on the peak. */
export const FLAG: Frac = { x: 0.532, y: 0.222 };

/** The open sky above the clouds, where the stars go. */
export const SKY = { x0: 0.05, x1: 0.95, y0: 0.025, y1: 0.16 } as const;

/** One loop of every ambient animation, in seconds: each period below divides it, so the loop is seamless. */
export const LOOP_S = 60;
/** The light runs up the path once per this many seconds... */
export const PATH_PERIOD_S = 7.5;
/** ...taking this long to climb; it is gone for the rest of the period. */
export const PATH_RUN_S = 5;
export const FLAG_PERIOD_S = 3;
/** Stars twinkle in groups, each with its own period (2-5 s) and phase: few animated layers, random look. */
export const STAR_GROUP_PERIODS_S = [2, 2.5, 3, 4, 5, 3] as const;
/** Stars per group; 6 groups -> 18 stars. */
export const STARS_PER_GROUP = 3;

/** A point of the picture on screen, for a picture drawn at `rect`. */
export const onScreen = (p: Frac, rect: Rect) => ({ x: rect.left + p.x * rect.width, y: rect.top + p.y * rect.height });

/** The path on screen, with each point's distance along it (for an even speed). */
export function pathOnScreen(rect: Rect) {
  const pts = PATH.map((p) => onScreen(p, rect));
  const along = [0];
  for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { xs: pts.map((p) => p.x), ys: pts.map((p) => p.y), along, length: along[along.length - 1] };
}

/** Where the light is at `s` (0-1 of the path's length), walking the polyline. */
export function pointAlong(xs: readonly number[], ys: readonly number[], along: readonly number[], s: number) {
  'worklet';
  const total = along[along.length - 1];
  const d = Math.min(1, Math.max(0, s)) * total;
  for (let i = 1; i < along.length; i++) {
    if (d <= along[i]) {
      const k = (d - along[i - 1]) / (along[i] - along[i - 1] || 1);
      return { x: xs[i - 1] + (xs[i] - xs[i - 1]) * k, y: ys[i - 1] + (ys[i] - ys[i - 1]) * k };
    }
  }
  return { x: xs[xs.length - 1], y: ys[ys.length - 1] };
}

/**
 * The path light at time `t` (seconds): where it is and how bright. It eases in at the camp, out
 * near the peak, and fades away before it reaches the collecting ring (where the ring's own sparks
 * are), so the two never meet.
 */
export function pathLight(
  t: number,
  xs: readonly number[],
  ys: readonly number[],
  along: readonly number[],
  ring: { x: number; y: number; radius: number } | null
) {
  'worklet';
  const phase = (t % PATH_PERIOD_S) / PATH_RUN_S;
  if (phase >= 1) return { x: xs[0], y: ys[0], opacity: 0 };
  const eased = phase < 0.5 ? 2 * phase * phase : 1 - 2 * (1 - phase) * (1 - phase);
  const p = pointAlong(xs, ys, along, eased);
  let opacity = Math.min(1, phase / 0.12) * Math.min(1, (1 - phase) / 0.2);
  if (ring) {
    const d = Math.hypot(p.x - ring.x, p.y - ring.y) - ring.radius;
    opacity *= Math.min(1, Math.max(0, d / 40));
  }
  return { x: p.x, y: p.y, opacity: opacity * 0.55 };
}

/** A star group's opacity at time `t`: a slow sine between faint and soft, never fully off. */
export function twinkle(t: number, period: number, phase: number) {
  'worklet';
  return 0.12 + 0.43 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t / period + phase)));
}

/** The flag's halo at time `t`: a gentle swell. */
export function flagPulse(t: number) {
  'worklet';
  const k = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / FLAG_PERIOD_S);
  return { opacity: 0.1 + 0.14 * k, scale: 1 + 0.18 * k };
}

/** A small deterministic random number generator (the sky looks the same every time). */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The stars, in picture fractions, grouped for twinkling; spread over the sky, a little apart. */
export function starField(seed = 11): { x: number; y: number; r: number; group: number; phase: number }[] {
  const rand = seeded(seed);
  const stars: { x: number; y: number; r: number; group: number; phase: number }[] = [];
  const groups = STAR_GROUP_PERIODS_S.length;
  let tries = 0;
  while (stars.length < groups * STARS_PER_GROUP && tries++ < 500) {
    const x = SKY.x0 + rand() * (SKY.x1 - SKY.x0);
    const y = SKY.y0 + rand() * (SKY.y1 - SKY.y0);
    if (stars.some((s) => Math.hypot(s.x - x, (s.y - y) * 2) < 0.06)) continue;
    stars.push({ x, y, r: 0.8 + rand() * 0.9, group: stars.length % groups, phase: 0 });
  }
  return stars.map((s) => ({ ...s, phase: (s.group * 0.37) % 1 }));
}
