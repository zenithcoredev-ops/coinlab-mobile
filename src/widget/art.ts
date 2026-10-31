/**
 * SVG art for the widget, drawn by AndroidSVG 1.4 inside the widget library. AndroidSVG has no filter
 * support (feGaussianBlur and friends are ignored), so glows are approximated with a few concentric
 * strokes of falling opacity and radial gradients. Every piece is drawn at its exact size in dp.
 */
export const GOLD = '#F5B942';
export const GOLD_LIGHT = '#FFD98A';
export const GREEN = '#4ADE80';
export const GREEN_DEEP = '#2ECC71';

const n = (v: number) => Number(v.toFixed(2));

/** Strokes stepping outward from `inset` with falling opacity: the closest thing to a blur. */
function halo(w: number, h: number, r: number, inset: number, stroke: string, steps: number[]): string {
  return steps
    .map((opacity, i) => {
      const d = inset - (i + 1) * 1.2;
      return `<rect x="${n(d)}" y="${n(d)}" width="${n(w - 2 * d)}" height="${n(h - 2 * d)}" rx="${n(r + (inset - d))}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="1.2"/>`;
    })
    .join('');
}

/**
 * The card: translucent dark glass (no real blur: the wallpaper just shows through), a thin
 * gold→green border with a soft outer glow, and faint gold/green light in two corners.
 */
export function cardFrameSvg(w: number, h: number, radius = 22): string {
  const g = 4; // room for the glow inside the drawn area
  const x = g;
  const rw = w - 2 * g;
  const rh = h - 2 * g;
  return (
    `<svg id="coinlab-card" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    '<defs>' +
    '<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#16241C" stop-opacity="0.80"/><stop offset="1" stop-color="#08110C" stop-opacity="0.88"/>' +
    '</linearGradient>' +
    `<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD}"/><stop offset="1" stop-color="${GREEN}"/></linearGradient>` +
    `<radialGradient id="warm" cx="0.12" cy="0.05" r="0.6"><stop offset="0" stop-color="${GOLD}" stop-opacity="0.10"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="cool" cx="0.95" cy="1" r="0.7"><stop offset="0" stop-color="${GREEN}" stop-opacity="0.14"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></radialGradient>` +
    '</defs>' +
    halo(w, h, radius, x, 'url(#edge)', [0.22, 0.1, 0.04]) +
    `<rect x="${x}" y="${x}" width="${rw}" height="${rh}" rx="${radius}" fill="url(#fill)"/>` +
    `<rect x="${x}" y="${x}" width="${rw}" height="${rh}" rx="${radius}" fill="url(#warm)"/>` +
    `<rect x="${x}" y="${x}" width="${rw}" height="${rh}" rx="${radius}" fill="url(#cool)"/>` +
    `<rect x="${n(x + 0.5)}" y="${n(x + 0.5)}" width="${n(rw - 1)}" height="${n(rh - 1)}" rx="${radius}" fill="none" stroke="url(#edge)" stroke-opacity="0.85" stroke-width="1"/>` +
    '</svg>'
  );
}

/** The mining label's capsule: green (mining) or gold (start / sign in) border with a soft glow. */
export function pillSvg(w: number, h: number, tone: 'green' | 'gold'): string {
  const main = tone === 'green' ? GREEN : GOLD;
  const g = 3;
  const r = (h - 2 * g) / 2;
  return (
    `<svg id="coinlab-pill-${tone}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    `<defs><linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${main}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient></defs>` +
    halo(w, h, r, g, main, [0.25, 0.1]) +
    `<rect x="${g}" y="${g}" width="${w - 2 * g}" height="${h - 2 * g}" rx="${n(r)}" fill="${main}" fill-opacity="0.12"/>` +
    `<rect x="${g + 0.6}" y="${g + 0.6}" width="${n(w - 2 * g - 1.2)}" height="${n(h - 2 * g - 1.2)}" rx="${n(r - 0.6)}" fill="none" stroke="url(#edge)" stroke-width="1.2"/>` +
    '</svg>'
  );
}

/** A thin rounded bar: faint track and a green→gold fill for `progress` 0..1. */
export function progressBarSvg(w: number, h: number, progress: number): string {
  const p = Math.min(1, Math.max(0, progress));
  const r = h / 2;
  const filled = Math.max(p > 0 ? h : 0, w * p);
  return (
    `<svg id="coinlab-progress" data-progress="${n(p)}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    `<defs><linearGradient id="fill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient></defs>` +
    `<rect x="0" y="0" width="${w}" height="${h}" rx="${n(r)}" fill="#FFFFFF" fill-opacity="0.10"/>` +
    (filled > 0 ? `<rect x="0" y="0" width="${n(filled)}" height="${h}" rx="${n(r)}" fill="url(#fill)"/>` : '') +
    '</svg>'
  );
}

/** The faceted gem used in the mining label. */
export function diamondSvg(color: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    `<path d="M7 4h10l4 5l-9 11L3 9z" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M3 9h18M9 4l-2 5l5 11l5-11l-2-5" fill="none" stroke="${color}" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="M19.5 1.5v3M18 3h3" stroke="${GOLD_LIGHT}" stroke-width="1.1" stroke-linecap="round"/>` +
    '</svg>'
  );
}
