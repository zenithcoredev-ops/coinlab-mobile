# Tab backgrounds

Background pictures for the tabs, wired up in `src/components/home/backgrounds.ts` (the only place to
change them). Without a picture a tab falls back to the drawn topographic background.

- `tasks-bg.webp`: the Tasks tab. Keep it at most 400 KB (a test checks), e.g.:

  ```bash
  cwebp -q 70 -resize 1080 0 tasks-bg.png -o tasks-bg.webp
  ```

  The app lays a ~65 % dark green-black layer and faint topographic lines over it, so a fairly low
  quality setting is fine.
