import type { ImageSourcePropType } from 'react-native';

import type { ImageFraming } from '@/lib/home-visuals';

/**
 * The one place a tab's background picture is set. A tab without a picture (null) gets the drawn
 * topographic background of the Collect screen, so a missing file never breaks the app.
 *
 * Tasks: when `assets/backgrounds/tasks-bg.webp` (≤ 400 KB, see assets/backgrounds/README.md) is in
 * the repo, replace `null` with `require('../../../assets/backgrounds/tasks-bg.webp')`. A test fails
 * if the file is there but not wired up here, or is too large.
 */
export const BACKGROUND_IMAGES: {
  home: ImageSourcePropType | null;
  tasks: ImageSourcePropType | null;
  league: ImageSourcePropType | null;
  profile: ImageSourcePropType | null;
} = {
  // Collect (home): `assets/backgrounds/home-bg.webp` (a night camp, a peak with a gold flag far
  // off). Once it is here, replace `null` with `require('../../../assets/backgrounds/home-bg.webp')`.
  // It scrolls with the screen, placed by HOME_BACKGROUND_FRAMING below.
  home: null,
  tasks: null,
  // League: when `assets/backgrounds/league-bg.webp` is in the repo, replace `null` with
  // `require('../../../assets/backgrounds/league-bg.webp')`. It gets a graded shade (darker at the
  // top and bottom).
  league: null,
  // Profile: `assets/backgrounds/profile-bg.webp` (a silhouette on a summit in front of the sun, in the
  // top third). Its shade is lighter at the top so the picture shows faintly behind the profile card.
  profile: null,
};

/** Largest a background picture may be, in bytes. */
export const BACKGROUND_MAX_BYTES = 400 * 1024;

/**
 * How the Collect picture is placed. `anchorY` is the one setting to move the peak up or down: it is
 * the peak's height within the picture (0 top, 1 bottom), and the picture is shifted so that point
 * sits on the centre of the collecting ring. `scale` zooms in slightly so the sides never show.
 */
export const HOME_BACKGROUND_FRAMING: ImageFraming = { scale: 1.12, anchorY: 0.5 };
