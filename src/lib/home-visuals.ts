/**
 * Pure helpers for the Collect screen's look: ring geometry, the sparks behind the ring's tip, the
 * topographic background lines, and the small league and task summaries. Kept free of React and
 * device APIs so they can be tested on their own.
 */

export type Point = { x: number; y: number };

/** The progress ring: radius, circumference, how much of the stroke to hide, and where its tip is. */
export function ringGeometry(size: number, stroke: number, progress: number) {
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  // 0 is at the top, going clockwise.
  const tipAngle = -Math.PI / 2 + p * 2 * Math.PI;
  return {
    r,
    center: c,
    circumference,
    dashOffset: circumference * (1 - p),
    tipAngle,
    tip: { x: c + r * Math.cos(tipAngle), y: c + r * Math.sin(tipAngle) },
  };
}

/** How many sparks trail the ring's tip. Few on purpose. */
export const SPARK_COUNT = 6;

/**
 * Where spark `i` is at time `t` (0..1 of the loop): each spark starts at the tip, drifts back along
 * the ring (behind the tip, never ahead of it) and a little outward, shrinking and fading. Runs on the
 * UI thread too, so it's a worklet.
 */
export function sparkFrame(i: number, t: number, tipAngle: number, r: number, center: number) {
  'worklet';
  const life = (t + i / SPARK_COUNT) % 1;
  // Each spark has its own lane, from a fixed pseudo-random spread.
  const lane = ((i * 37) % 11) / 10 - 0.5; // -0.5..0.5
  const back = life * (0.16 + 0.04 * Math.abs(lane)); // radians behind the tip
  const out = lane * 10 * life + 3 * life;
  const angle = tipAngle - back;
  const radius = r + out;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
    opacity: Math.max(0, 1 - life) * 0.9,
    size: 0.6 + 1.8 * (1 - life),
  };
}

/** A small deterministic random number generator, so the background looks the same on every draw. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A closed, wobbly loop around `center`: the shape of one topographic line, as an SVG path. */
export function wobblyLoop(center: Point, radius: number, wobble: number, phase: number, points = 48): string {
  const segments: string[] = [];
  for (let k = 0; k <= points; k++) {
    const a = (k / points) * Math.PI * 2;
    const rr = radius * (1 + wobble * (0.6 * Math.sin(3 * a + phase) + 0.4 * Math.sin(5 * a + phase * 1.7)));
    const x = center.x + rr * Math.cos(a);
    const y = center.y + rr * Math.sin(a) * 0.82;
    segments.push(`${k === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return segments.join(' ') + ' Z';
}

/**
 * Topographic lines for a `width` x `height` area: a few "hills", each a set of nested wobbly loops.
 * Deterministic for a given seed.
 */
export function contourPaths(width: number, height: number, seed = 7): string[] {
  if (width <= 0 || height <= 0) return [];
  const rand = seeded(seed);
  const hills = Math.max(3, Math.round((width * height) / 120_000));
  const paths: string[] = [];
  for (let h = 0; h < hills; h++) {
    const center = { x: rand() * width, y: rand() * height };
    const rings = 4 + Math.floor(rand() * 4);
    const phase = rand() * Math.PI * 2;
    for (let k = 1; k <= rings; k++) paths.push(wobblyLoop(center, k * (22 + rand() * 10), 0.12 + rand() * 0.08, phase + k * 0.3));
  }
  return paths;
}

/** The turquoise neon lines around the collecting ring. */
export function ringContours(center: Point, ringRadius: number): string[] {
  return [1.28, 1.5, 1.78].map((f, i) => wobblyLoop(center, ringRadius * f, 0.07 + i * 0.02, 0.9 + i * 1.3, 64));
}

/** What the small league card shows, from what was saved about the league. */
export type LeagueCardInfo =
  | { kind: 'unknown' }
  | { kind: 'locked'; missing: number }
  | { kind: 'tournament' }
  | { kind: 'active'; league: number; rank: number | null; toPromotion: number | null; isDiamond: boolean };

export function leagueCardInfo(
  snapshot: {
    state?: 'locked' | 'active' | 'tournament';
    league?: number;
    rank?: number | null;
    promoteCount?: number;
    tournamentCount?: number;
    entryRequired?: number;
  } | null,
  balance: number,
  diamondLeague: number
): LeagueCardInfo {
  if (!snapshot?.state) return { kind: 'unknown' };
  if (snapshot.state === 'locked') return { kind: 'locked', missing: Math.max(0, (snapshot.entryRequired ?? 0) - balance) };
  if (snapshot.state === 'tournament') return { kind: 'tournament' };
  const league = snapshot.league ?? 0;
  const isDiamond = league === diamondLeague;
  const rank = snapshot.rank ?? null;
  const band = isDiamond ? snapshot.tournamentCount : snapshot.promoteCount;
  const toPromotion = rank !== null && band ? Math.max(0, rank - band) : null;
  return { kind: 'active', league, rank, toPromotion, isDiamond };
}

/** Daily tasks at a glance: how many are done, and the first one still open. */
export function tasksSummary<T extends { claimed: boolean; isComplete: boolean }>(tasks: T[]) {
  const done = tasks.filter((t) => t.claimed || t.isComplete).length;
  const next = tasks.find((t) => !t.claimed && !t.isComplete) ?? tasks.find((t) => !t.claimed) ?? null;
  return { done, total: tasks.length, progress: tasks.length ? done / tasks.length : 0, next };
}

/** How a framed background picture is placed: zoom, and where its focal point (e.g. a peak) sits in it. */
export type ImageFraming = {
  /** Width of the picture relative to the screen; above 1 zooms in a little. */
  scale: number;
  /** Height of the focal point within the picture, 0 (top) to 1 (bottom). */
  anchorY: number;
};

/**
 * Where to draw a picture of aspect `aspect` (height / width) in a layer `layerWidth` wide so that
 * its focal point lands on `focusY`, centred horizontally and `scale` times the layer's width. If
 * that would leave a gap above the picture, it is zoomed in further (still centred on the point) so
 * it always reaches the top of the screen.
 */
export function framedImageRect(layerWidth: number, focusY: number, aspect: number, framing: ImageFraming) {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const anchor = Math.min(1, Math.max(0.01, framing.anchorY));
  const widthToReachTop = Math.max(0, focusY) / (anchor * a);
  const width = Math.max(layerWidth * Math.max(1, framing.scale), widthToReachTop);
  const height = width * a;
  return {
    left: (layerWidth - width) / 2,
    top: focusY - anchor * height,
    width,
    height,
  };
}
