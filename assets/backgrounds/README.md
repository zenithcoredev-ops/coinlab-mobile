# Tab backgrounds

Background pictures for the tabs, wired up in `src/components/home/backgrounds.ts` (the only place to
change them, together with each tab's shade). Without a picture a tab falls back to the drawn
topographic background.

| File | Tab | Treatment |
| --- | --- | --- |
| `home-bg.webp` | Collect | Scrolls with the screen; `HOME_BACKGROUND_FRAMING.anchorY` (the flag's height in the picture, 0.23) puts the peak on the ring's centre. Light graded shade (~45 % in the middle); faint topographic lines, turquoise contours and scan light on top. |
| `tasks-bg.webp` | Tasks | Darker graded shade (~75 % top, ~60-65 % middle), green tint, less saturation (Android). |
| `league-bg.webp` | League | Light graded shade (~50 % in the middle) so the aurora and the neon path show. |
| `friends-bg.webp` | Friends | Dark at the top, almost none at the bottom; slides slowly with the list (parallax), with room at the end so the friends show. |
| `profile-bg.webp` | Profile | Lighter in the top third (the figure on the summit shows behind the profile card), dark below. |

Each file must be at most 400 KB (a test checks), e.g.:

```bash
cwebp -q 70 -resize 1080 0 picture.png -o tasks-bg.webp
```

After changing a picture, refresh `brightness.json` (the brightest colours of each picture, used by
the WCAG contrast test) with:

```bash
python3 scripts/background-brightness.py
```

Text outside the cards sits on a dark scrim (`TextScrim`), and the cards are dark glass, so text stays
at WCAG AA whatever the picture shows; the contrast test checks the rest against `brightness.json`.
