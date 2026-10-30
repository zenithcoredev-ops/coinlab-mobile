const R = 15;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** The prototype's steps ring: a track and a gold arc from 12 o'clock, `progress` 0..1. */
export function stepsRingSvg(progress: number, color: string, track = 'rgba(255,255,255,0.1)'): string {
  const filled = Math.min(1, Math.max(0, progress)) * CIRCUMFERENCE;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">' +
    `<circle cx="18" cy="18" r="${R}" fill="none" stroke="${track}" stroke-width="4"/>` +
    (filled > 0
      ? `<circle cx="18" cy="18" r="${R}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" ` +
        `stroke-dasharray="${filled.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}" transform="rotate(-90 18 18)"/>`
      : '') +
    '</svg>'
  );
}
