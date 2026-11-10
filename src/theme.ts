// The single source of truth for how the app looks. Screens must take every
// color, font, spacing and radius value from here - no literals in components -
// so a redesign only means editing this file. Values are the prototype's
// (docs/coinlab-prototip-5.html) and are provisional.
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

const palette = {
  bg: '#0A130F',
  surface: '#12201A',
  // Cards stand out from the background (about 1.5:1), and muted text on them stays at WCAG AA.
  surface2: '#22382C',
  gold: '#F5B942',
  goldDim: '#8A6A28',
  goldLight: '#FFD98A',
  teal: '#2ECC71',
  text: '#E8ECF4',
  muted: '#A3ACBD',
  danger: '#F7837D',
  black: '#000000',
  goldInk: '#3A2A05',
  silver: '#C0C6D4',
  bronze: '#CD8B5A',
  // Neon look of the Collect screen.
  bgDeep: '#050B08',
  neon: '#34E37F',
  neonDeep: '#0F7A3F',
  neonInk: '#04170C',
  turquoise: '#3FE0C5',
  softWhite: '#C3CBD3',
} as const;

// `#RRGGBB` + alpha (0-1) -> `#RRGGBBAA`.
function alpha(hex: string, a: number) {
  return hex + Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase();
}

export const theme = {
  colors: {
    background: palette.bg,
    surface: palette.surface,
    surfaceRaised: palette.surface2,
    text: palette.text,
    textMuted: palette.muted,
    accent: palette.gold, // CLB, streak, boosts
    accentDim: palette.goldDim,
    accentLight: palette.goldLight,
    accentInk: palette.goldInk, // text on top of an accent-filled surface
    positive: palette.teal, // active mining, success
    danger: palette.danger,
    medalGold: palette.gold,
    medalSilver: palette.silver,
    medalBronze: palette.bronze,
    frameChampion: palette.gold,
    frameRunnerUp: palette.silver,
    frameThirdPlace: palette.bronze,
    border: alpha('#FFFFFF', 0.1),
    divider: alpha('#FFFFFF', 0.05),
    accentSoft: alpha(palette.gold, 0.1),
    accentBorder: alpha(palette.gold, 0.3),
    positiveSoft: alpha(palette.teal, 0.12),
    positiveBorder: alpha(palette.teal, 0.35),
    dangerSoft: alpha(palette.danger, 0.12),
    ringTrack: alpha('#FFFFFF', 0.1),
    overlay: alpha(palette.black, 0.6),
    /** Progress bars: the filled part while going, and once complete. */
    progressFill: palette.teal,
    progressDone: palette.gold,
    // Mining button states
    coreIdle: palette.gold,
    coreActive: '#1B2439',
    coreDone: '#1A2A1C',
    tabBar: palette.surface,
    // Neon (Collect screen): green is the main colour, gold only for rewards, turquoise only in the background.
    bgDeep: palette.bgDeep,
    neon: palette.neon,
    neonDeep: palette.neonDeep,
    neonInk: palette.neonInk,
    neonSoft: alpha(palette.neon, 0.12),
    neonGlow: alpha(palette.neon, 0.55),
    goldGlow: alpha(palette.gold, 0.55),
    turquoise: palette.turquoise,
    contour: alpha(palette.teal, 0.1),
    // Over a background picture: the dark layer, and topographic lines fainter still.
    imageShade: alpha(palette.bgDeep, 0.65),
    contourFaint: alpha(palette.teal, 0.06),
    glass: alpha('#08130D', 0.72),
    tabInactive: palette.softWhite,
  },
  fonts: {
    // Family names registered by useFonts in the root layout (see `fontAssets`). Lexend: round and
    // geometric, with every Turkish letter (ş ğ ı İ ö ü ç).
    display: 'Lexend_700Bold',
    displayMedium: 'Lexend_600SemiBold',
    rounded: 'Lexend_500Medium',
    mono: 'DMMono_400Regular',
    monoMedium: 'DMMono_500Medium',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
  },
  fontSizes: { xs: 11, sm: 12.5, md: 14, lg: 18, xl: 22, xxl: 32, hero: 52 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 32 },
  radius: { sm: 8, md: 14, lg: 20, pill: 999 },
  // Mining screen geometry
  ring: { size: 198, stroke: 6, coreSize: 148 },
} as const;

export const fontAssets = {
  DMMono_400Regular,
  DMMono_500Medium,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
};

export type Theme = typeof theme;
