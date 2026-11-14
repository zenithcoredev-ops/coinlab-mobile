import { BACKGROUND_SHADES, BackgroundTab, ShadeStops } from '@/components/home/backgrounds';
import { theme } from '@/theme';

/**
 * Text over the tab pictures stays at WCAG AA. assets/backgrounds/brightness.json holds, for each
 * picture, the colour of its brightest pixels in 40 bands top to bottom (scripts/background-brightness.py);
 * here each tab's shade is laid over those colours and every text colour is checked against the result.
 */

const fs = require('fs') as { readFileSync(f: string, e: 'utf8'): string; statSync(f: string): { size: number } };
type Profile = { bytes: number; width: number; height: number; bands: [number, number, number][] };
const PROFILES = JSON.parse(fs.readFileSync('assets/backgrounds/brightness.json', 'utf8')) as Record<string, Profile>;

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const alphaOf = (hex: string) => (hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1);
const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `top` (opacity `a`) over `under`. */
const over = (under: number[], top: number[], a: number) => under.map((c, i) => c * (1 - a) + top[i] * a);
const shadeAt = (stops: ShadeStops, y: number) => {
  for (let i = 1; i < stops.length; i++) {
    const [y0, a0] = stops[i - 1];
    const [y1, a1] = stops[i];
    if (y <= y1) return a0 + ((a1 - a0) * (y - y0)) / (y1 - y0 || 1);
  }
  return stops[stops.length - 1][1];
};

const BG = rgb(theme.colors.bgDeep);
const GLASS = rgb(theme.colors.glass.slice(0, 7));
const GLASS_A = alphaOf(theme.colors.glass);
const SCRIM_A = alphaOf(theme.colors.scrim);
const C = {
  text: rgb(theme.colors.text),
  soft: rgb(theme.colors.tabInactive),
  muted: rgb(theme.colors.textMuted),
  neon: rgb(theme.colors.neon),
  gold: rgb(theme.colors.accent),
  danger: rgb(theme.colors.danger),
};
type ColorName = keyof typeof C;

// A tall phone screen; the pictures fill it ("cover").
const SCREEN = { w: 390, h: 844 };

/** The brightest picture colour at screen height `y` (0-1) of a picture covering the screen, slid up by `shift` (0-1 of the screen). */
function pictureAt(p: Profile, y: number, shift = 0, boxHeight = 1) {
  const box = { w: SCREEN.w, h: SCREEN.h * boxHeight };
  const scale = Math.max(box.w / p.width, box.h / p.height);
  const shown = p.height * scale;
  const crop = (shown - box.h) / 2;
  const f = (crop + (y + shift) * SCREEN.h) / shown;
  const band = Math.min(p.bands.length - 1, Math.max(0, Math.floor(f * p.bands.length)));
  return p.bands[band];
}

/** The worst contrast of `colors` over `tab`'s shaded picture between screen heights y0 and y1, optionally on glass. */
function worst(tab: BackgroundTab, colors: ColorName[], y0: number, y1: number, opts: { glass?: boolean; shifts?: number[]; boxHeight?: number } = {}) {
  const p = PROFILES[`${tab}-bg.webp`];
  let min = Infinity;
  let at = '';
  for (const shift of opts.shifts ?? [0]) {
    for (let y = y0; y <= y1 + 1e-9; y += 0.0125) {
      let bg = over(pictureAt(p, y, shift, opts.boxHeight), BG, shadeAt(BACKGROUND_SHADES[tab], y));
      if (opts.glass) bg = over(bg, GLASS, GLASS_A);
      for (const name of colors) {
        const c = contrast(C[name], bg);
        if (c < min) [min, at] = [c, `${name} at y=${y.toFixed(2)} shift=${shift}`];
      }
    }
  }
  return { min: Math.round(min * 100) / 100, at };
}

const FRIENDS_SLIDE = { shifts: [0, 0.055, 0.11, 0.165, 0.22], boxHeight: 1.22 };

describe('background pictures and text contrast', () => {
  it('the brightness profile matches the pictures (run scripts/background-brightness.py after changing one)', () => {
    for (const [file, p] of Object.entries(PROFILES)) {
      expect([file, fs.statSync(`assets/backgrounds/${file}`).size]).toEqual([file, p.bytes]);
    }
    expect(Object.keys(PROFILES).sort()).toEqual(['friends-bg.webp', 'home-bg.webp', 'league-bg.webp', 'profile-bg.webp', 'tasks-bg.webp']);
  });

  it('a scrim keeps every text colour at AA even over pure white', () => {
    const white = [255, 255, 255];
    for (const name of Object.keys(C) as ColorName[]) {
      expect([name, contrast(C[name], over(white, BG, SCRIM_A)) >= 4.5]).toEqual([name, true]);
    }
  });

  it.each(['tasks', 'league', 'profile'] as BackgroundTab[])('%s: text on the glass cards stays at AA anywhere on the screen', (tab) => {
    const r = worst(tab, ['text', 'soft', 'neon', 'gold', 'danger'], 0, 1, { glass: true });
    expect([tab, r.min >= 4.5, r.at]).toEqual([tab, true, r.at]);
  });

  it('friends: text on its glass invite card stays at AA as the picture slides', () => {
    const r = worst('friends', ['text', 'soft', 'neon'], 0, 1, { glass: true, ...FRIENDS_SLIDE });
    expect([r.min >= 4.5, r.at]).toEqual([true, r.at]);
  });

  it('home: text on the glass cards stays at AA over any part of the picture', () => {
    const p = PROFILES['home-bg.webp'];
    const lightest = Math.min(...BACKGROUND_SHADES.home.map(([, a]) => a));
    for (const band of p.bands) {
      const bg = over(over(band, BG, lightest), GLASS, GLASS_A);
      for (const name of ['text', 'soft', 'neon', 'gold', 'danger'] as ColorName[]) expect([name, contrast(C[name], bg) >= 4.5]).toEqual([name, true]);
    }
  });

  // Text outside the cards without a scrim only scrolls up from where it starts, so it only meets
  // the screen above its starting place.
  it.each([
    ['tasks', 0.24],
    ['league', 0.22],
    ['profile', 0.1],
  ] as [BackgroundTab, number][])('%s: the header and the title above the cards stay at AA', (tab, bottom) => {
    const r = worst(tab, ['text'], 0, bottom);
    expect([tab, r.min >= 4.5, r.at]).toEqual([tab, true, r.at]);
  });

  it('friends: the header stays at AA as the picture slides', () => {
    const r = worst('friends', ['text'], 0, 0.1, FRIENDS_SLIDE);
    expect([r.min >= 4.5, r.at]).toEqual([true, r.at]);
  });
});
