import { GOLD, GOLD_LIGHT, GREEN_DEEP } from './art';

const R = 15;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * The steps ring: a dark green glassy disc, a faint track, a gold arc from 12 o'clock for `progress`
 * 0..1 (real progress, round caps) and a soft glow (concentric strokes; AndroidSVG has no blur).
 * The count is drawn over it as text.
 */
export function stepsRingSvg(progress: number): string {
  const filled = Math.min(1, Math.max(0, progress)) * CIRCUMFERENCE;
  return (
    '<svg id="coinlab-ring" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
    '<defs>' +
    `<radialGradient id="disc" cx="0.5" cy="0.38" r="0.62"><stop offset="0" stop-color="${GREEN_DEEP}" stop-opacity="0.32"/><stop offset="1" stop-color="#06100B" stop-opacity="0.9"/></radialGradient>` +
    `<linearGradient id="arc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>` +
    '</defs>' +
    `<circle cx="20" cy="20" r="${R + 3.2}" fill="none" stroke="${GOLD}" stroke-opacity="0.08" stroke-width="1.4"/>` +
    `<circle cx="20" cy="20" r="${R + 1.9}" fill="none" stroke="${GOLD}" stroke-opacity="0.16" stroke-width="1.2"/>` +
    `<circle cx="20" cy="20" r="${R - 1.6}" fill="url(#disc)"/>` +
    `<circle cx="20" cy="20" r="${R}" fill="none" stroke="${GOLD}" stroke-opacity="0.18" stroke-width="2.6"/>` +
    (filled > 0
      ? `<circle cx="20" cy="20" r="${R}" fill="none" stroke="url(#arc)" stroke-width="2.6" stroke-linecap="round" ` +
        `stroke-dasharray="${filled.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}" transform="rotate(-90 20 20)"/>`
      : '') +
    '</svg>'
  );
}
