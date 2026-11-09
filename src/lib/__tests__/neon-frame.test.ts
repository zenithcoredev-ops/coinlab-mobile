import { bracketPaths, edgeRects, haloRects, NEON_CARD } from '../neon-frame';

describe('neon card frame', () => {
  const w = 300;
  const h = 120;
  const o = NEON_CARD.halo;

  it('draws the halo just outside the card, fading outward and staying inside its canvas', () => {
    const rects = haloRects(w, h);
    expect(rects).toHaveLength(NEON_CARD.haloLayers);
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      // Outside the card's edge…
      expect(r.x).toBeLessThan(o);
      expect(r.width).toBeGreaterThan(w);
      // …but its stroke stays on the canvas, which is `halo` larger on each side.
      expect(r.x - r.strokeWidth / 2).toBeGreaterThanOrEqual(-0.001);
      expect(r.x + r.width + r.strokeWidth / 2).toBeLessThanOrEqual(w + 2 * o + 0.001);
      if (i > 0) {
        expect(r.x).toBeLessThan(rects[i - 1].x);
        expect(r.opacity).toBeLessThan(rects[i - 1].opacity);
      }
    }
    expect(rects[0].opacity).toBeCloseTo(NEON_CARD.haloOpacity);
    expect(haloRects(0, 100)).toEqual([]);
  });

  it('keeps the bright edge and the inner glow on the card', () => {
    const rects = edgeRects(w, h);
    const edge = rects[rects.length - 1];
    expect(edge.opacity).toBe(NEON_CARD.border.opacity);
    expect(edge.x).toBeCloseTo(o + NEON_CARD.border.width / 2);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(o);
      expect(r.x + r.width).toBeLessThanOrEqual(o + w);
    }
  });

  it('puts a bracket in each corner', () => {
    const paths = bracketPaths(w, h);
    expect(paths).toHaveLength(4);
    expect(paths[0]).toBe(`M${o + 9} ${o + 25} L${o + 9} ${o + 9} L${o + 25} ${o + 9}`);
  });
});
