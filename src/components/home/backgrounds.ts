import type { ImageSourcePropType } from 'react-native';

import type { ImageFraming } from '@/lib/home-visuals';

/** The tabs that have a background picture. */
export type BackgroundTab = 'home' | 'tasks' | 'league' | 'friends' | 'profile';

/**
 * The one place a tab's background picture is set (files in assets/backgrounds, each at most 400 KB;
 * see its README). A tab whose picture is null falls back to the drawn topographic background, so a
 * missing file never breaks the app. A test fails if a file is there but not wired up here, or is
 * too large.
 */
export const BACKGROUND_IMAGES: Record<BackgroundTab, ImageSourcePropType | null> = {
  // A night camp, a peak with a gold flag far off. Scrolls with the screen, placed by
  // HOME_BACKGROUND_FRAMING.
  home: require('../../../assets/backgrounds/home-bg.webp'),
  // Misty mountains at sunset: bright and orange, so a darker shade, a green tint and less saturation.
  tasks: require('../../../assets/backgrounds/tasks-bg.webp'),
  // A summit with a neon path under the aurora.
  league: require('../../../assets/backgrounds/league-bg.webp'),
  // Four friends facing the summit, at the bottom of the picture: it slides slowly as the list
  // scrolls (parallax), so they come into view at the end.
  friends: require('../../../assets/backgrounds/friends-bg.webp'),
  // Someone on the summit in front of the sun, in the top third.
  profile: require('../../../assets/backgrounds/profile-bg.webp'),
};

/** [offset 0-1 down the screen, opacity] of the dark layer over a picture. */
export type ShadeStops = readonly (readonly [number, number])[];

/**
 * Each tab's dark layer over its picture. Text on the glass cards and in the scrims stays at WCAG AA
 * whatever is underneath; the background-contrast test checks the rest (titles above the cards)
 * against the brightest parts of each picture (assets/backgrounds/brightness.json).
 */
export const BACKGROUND_SHADES: Record<BackgroundTab, ShadeStops> = {
  // Light: ~45 % in the middle, a little darker at the top and bottom.
  home: [
    [0, 0.6],
    [0.3, 0.45],
    [0.7, 0.45],
    [1, 0.62],
  ],
  // Dark: ~75 % at the top, ~60-65 % in the middle.
  tasks: [
    [0, 0.76],
    [0.35, 0.65],
    [0.65, 0.62],
    [1, 0.72],
  ],
  // Light enough for the aurora and the neon path: ~50 % in the middle.
  league: [
    [0, 0.68],
    [0.3, 0.5],
    [0.7, 0.5],
    [1, 0.72],
  ],
  // Dark at the top, almost none at the bottom where the friends stand.
  friends: [
    [0, 0.85],
    [0.35, 0.6],
    [0.7, 0.25],
    [1, 0.08],
  ],
  // Lighter in the top third (the figure on the summit shows faintly behind the profile card), dark below.
  profile: [
    [0, 0.42],
    [0.3, 0.5],
    [0.5, 0.8],
    [1, 0.9],
  ],
};

/** The Tasks picture's extra treatment: a green tint and less colour (the saturation filter is Android-only). */
export const TASKS_TINT = { opacity: 0.14, saturation: 0.55 };

/**
 * How the Collect picture is placed. `anchorY` is the one setting to move the peak up or down: it is
 * the peak's height within the picture (0 top, 1 bottom; the flag is at about 23 %), and the picture
 * is shifted so that point sits on the centre of the collecting ring. `scale` zooms in slightly;
 * `maxScale` caps the extra zoom used to reach the top of the screen (above that the picture fades in
 * from the background instead, behind the header).
 */
export const HOME_BACKGROUND_FRAMING: ImageFraming = { scale: 1.12, anchorY: 0.23, maxScale: 1.3 };

/** Largest a background picture may be, in bytes. */
export const BACKGROUND_MAX_BYTES = 400 * 1024;
