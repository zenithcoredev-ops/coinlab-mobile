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
});
