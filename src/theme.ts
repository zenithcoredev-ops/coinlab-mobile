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
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

const palette = {
  bg: '#0A130F',
  surface: '#12201A',
  surface2: '#1A2B22',
  gold: '#F5B942',
  goldDim: '#8A6A28',
  goldLight: '#FFD98A',
  teal: '#2ECC71',
  text: '#E8ECF4',
  muted: '#8892A6',
  danger: '#F5716A',
  black: '#000000',
  goldInk: '#3A2A05',
  silver: '#C0C6D4',
  bronze: '#CD8B5A',
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
    medalSilver: palette.silver,
    medalBronze: palette.bronze,
    border: alpha('#FFFFFF', 0.06),
    divider: alpha('#FFFFFF', 0.05),
    accentSoft: alpha(palette.gold, 0.1),
    accentBorder: alpha(palette.gold, 0.3),
    positiveSoft: alpha(palette.teal, 0.12),
    positiveBorder: alpha(palette.teal, 0.35),
    dangerSoft: alpha(palette.danger, 0.12),
    ringTrack: alpha('#FFFFFF', 0.06),
    overlay: alpha(palette.black, 0.6),
    // Mining button states
    coreIdle: palette.gold,
    coreActive: '#1B2439',
    coreDone: '#1A2A1C',
    tabBar: palette.surface,
  },
  fonts: {
    // Family names registered by useFonts in the root layout (see `fontAssets`).
    display: 'SpaceGrotesk_700Bold',
    displayMedium: 'SpaceGrotesk_600SemiBold',
    mono: 'DMMono_400Regular',
    monoMedium: 'DMMono_500Medium',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
  },
  fontSizes: { xs: 11, sm: 12.5, md: 14, lg: 18, xl: 22, xxl: 32 },
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
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
};

export type Theme = typeof theme;
