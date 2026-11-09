import { theme } from '@/theme';

// WCAG 2.x relative luminance and contrast ratio.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const { colors } = theme;
const surfaces = { background: colors.background, surface: colors.surface, surfaceRaised: colors.surfaceRaised };
const texts = { text: colors.text, textMuted: colors.textMuted, accent: colors.accent, positive: colors.positive, danger: colors.danger };

describe('theme contrast', () => {
  it.each(Object.entries(surfaces))('every text colour on %s meets WCAG AA (4.5:1)', (_name, surface) => {
    for (const [name, color] of Object.entries(texts)) {
      expect([name, contrast(color, surface) >= 4.5]).toEqual([name, true]);
    }
  });

  it('cards stand out from the background', () => {
    expect(contrast(colors.surfaceRaised, colors.background)).toBeGreaterThanOrEqual(1.45);
  });

  // The Collect screen: glass cards over the near-black green background. The glass is see-through,
  // so it is checked laid over that background (the lightest it can look is the background's own
  // colour, and the topographic lines are too faint to change that).
  it('the Collect screen’s texts meet WCAG AA on its background and glass cards', () => {
    const over = (top: string, bottom: string) => {
      const a = parseInt(top.slice(7, 9), 16) / 255;
      const mix = (i: number) => Math.round(parseInt(top.slice(i, i + 2), 16) * a + parseInt(bottom.slice(i, i + 2), 16) * (1 - a));
      return '#' + [1, 3, 5].map((i) => mix(i).toString(16).padStart(2, '0')).join('');
    };
    const grounds = { bgDeep: colors.bgDeep, glass: over(colors.glass, colors.bgDeep) };
    const homeTexts = { text: colors.text, tabInactive: colors.tabInactive, neon: colors.neon, accent: colors.accent, danger: colors.danger };
    for (const [g, ground] of Object.entries(grounds)) {
      for (const [name, color] of Object.entries(homeTexts)) {
        expect([g, name, contrast(color, ground) >= 4.5]).toEqual([g, name, true]);
      }
    }
    // Dark ink on the filled green start button, play button and active tab.
    expect(contrast(colors.neonInk, colors.neon)).toBeGreaterThanOrEqual(4.5);
  });
});
