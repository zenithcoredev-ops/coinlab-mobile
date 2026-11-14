# Tab backgrounds

Background pictures for the tabs, wired up in `src/components/home/backgrounds.ts` (the only place to
change them). Without a picture a tab falls back to the drawn topographic background.

- `profile-bg.webp`: the Profile tab (a silhouette on a summit in front of the sun, top third). Its shade is lighter at the top so the picture shows faintly behind the profile card. Same 400 KB limit.
- `league-bg.webp`: the League tab, under a graded shade (darker at the top and bottom). Same 400 KB limit.
- `tasks-bg.webp`: the Tasks tab. Keep it at most 400 KB (a test checks), e.g.:

  ```bash
  cwebp -q 70 -resize 1080 0 tasks-bg.png -o tasks-bg.webp
  ```

  The app lays a ~65 % dark green-black layer and faint topographic lines over it, so a fairly low
  quality setting is fine.
