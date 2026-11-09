/**
 * The neon card's look in one place: how far its halo reaches outside the card and how its glow fades.
 * Every neon card (Collect, Tasks, and later League, Friends, Profile) uses these values.
 *
 * The halo is drawn, not a shadow: Android has no coloured shadows, so a few nested rounded outlines
 * just outside the edge, each fainter than the last, stand in for a blur. It looks the same on iOS
 * and Android and costs a handful of static SVG strokes per card.
 */
export const NEON_CARD = {
  radius: 18,
  /** How far the halo reaches past the card's edge. */
  halo: 14,
  haloLayers: 6,
  haloStrokeWidth: 2.6,
  /** Opacity of the innermost halo layer; the others fade out from it. */
  haloOpacity: 0.24,
  /** Inside the edge: a wide faint glow and a narrower brighter one. */
  innerGlow: [
    { inset: 5, width: 10, opacity: 0.1 },
    { inset: 2, width: 4, opacity: 0.3 },
  ],
  border: { width: 1.6, opacity: 1 },
  bracket: { inset: 9, arm: 16, width: 2.4 },
  grid: { step: 18, opacity: 0.06 },
} as const;

export type FrameRect = { x: number; y: number; width: number; height: number; rx: number; strokeWidth: number; opacity: number };

/**
 * The halo's outlines for a `w` x `h` card, in the coordinates of a canvas that is `halo` larger on
 * every side (so the card's top-left is at (halo, halo)). Outermost last, faintest last.
 */
export function haloRects(w: number, h: number, c = NEON_CARD): FrameRect[] {
  if (w <= 0 || h <= 0) return [];
  const step = (c.halo - c.haloStrokeWidth / 2) / c.haloLayers;
  return Array.from({ length: c.haloLayers }, (_, k) => {
    const out = (k + 0.5) * step; // centre of this outline, outside the edge
    const fade = 1 - k / c.haloLayers;
    return {
      x: c.halo - out,
      y: c.halo - out,
      width: w + 2 * out,
      height: h + 2 * out,
      rx: c.radius + out,
      strokeWidth: c.haloStrokeWidth,
      opacity: c.haloOpacity * fade * fade,
    };
  });
}

/** The glow inside the edge and the edge itself, in the halo canvas's coordinates. */
export function edgeRects(w: number, h: number, c = NEON_CARD): FrameRect[] {
  if (w <= 0 || h <= 0) return [];
  const inner = c.innerGlow.map((g) => ({
    x: c.halo + g.inset,
    y: c.halo + g.inset,
    width: w - 2 * g.inset,
    height: h - 2 * g.inset,
    rx: Math.max(0, c.radius - g.inset),
    strokeWidth: g.width,
    opacity: g.opacity,
  }));
  const b = c.border.width / 2;
  return [...inner, { x: c.halo + b, y: c.halo + b, width: w - 2 * b, height: h - 2 * b, rx: c.radius, strokeWidth: c.border.width, opacity: c.border.opacity }];
}

/** L-shaped marks just inside each corner, in the halo canvas's coordinates. */
export function bracketPaths(w: number, h: number, c = NEON_CARD): string[] {
  const o = c.halo;
  const i = c.bracket.inset;
  const l = c.bracket.arm;
  const L = o + i;
  const R = o + w - i;
  const T = o + i;
  const B = o + h - i;
  return [
    `M${L} ${T + l} L${L} ${T} L${L + l} ${T}`,
    `M${R - l} ${T} L${R} ${T} L${R} ${T + l}`,
    `M${L} ${B - l} L${L} ${B} L${L + l} ${B}`,
    `M${R - l} ${B} L${R} ${B} L${R} ${B - l}`,
  ];
}
