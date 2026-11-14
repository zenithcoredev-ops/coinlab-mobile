import type { ImageSourcePropType } from 'react-native';

/**
 * The one place a tab's background picture is set. A tab without a picture (null) gets the drawn
 * topographic background of the Collect screen, so a missing file never breaks the app.
 *
 * Tasks: when `assets/backgrounds/tasks-bg.webp` (≤ 400 KB, see assets/backgrounds/README.md) is in
 * the repo, replace `null` with `require('../../../assets/backgrounds/tasks-bg.webp')`. A test fails
 * if the file is there but not wired up here, or is too large.
 */
export const BACKGROUND_IMAGES: {
  tasks: ImageSourcePropType | null;
  league: ImageSourcePropType | null;
  profile: ImageSourcePropType | null;
} = {
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
