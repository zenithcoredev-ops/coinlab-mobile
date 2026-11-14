# Tab backgrounds

Background pictures for the tabs, wired up in `src/components/home/backgrounds.ts` (the only place to
change them). Without a picture a tab falls back to the drawn topographic background.

- `home-bg.webp`: the Collect tab (a night camp, a peak with a gold flag far off). It scrolls with the screen; `HOME_BACKGROUND_FRAMING` in backgrounds.ts places it: `anchorY` is the peak's height in the picture (0 top, 1 bottom) and is the one setting to move it, the picture being shifted so that point sits on the ring's centre; `scale` zooms in slightly. A light graded shade (~45 % in the middle, darker at the top and bottom) goes over it, and the topographic lines, turquoise contours and scan light stay on top, fainter. Same 400 KB limit.
- `profile-bg.webp`: the Profile tab (a silhouette on a summit in front of the sun, top third). Its shade is lighter at the top so the picture shows faintly behind the profile card. Same 400 KB limit.
- `league-bg.webp`: the League tab, under a graded shade (darker at the top and bottom). Same 400 KB limit.
- `tasks-bg.webp`: the Tasks tab. Keep it at most 400 KB (a test checks), e.g.:

  ```bash
  cwebp -q 70 -resize 1080 0 tasks-bg.png -o tasks-bg.webp
  ```

  The app lays a ~65 % dark green-black layer and faint topographic lines over it, so a fairly low
  quality setting is fine.
