#!/usr/bin/env python3
"""
Builds every app icon from the master artwork, assets/brand/waligo-app-icon.png (1024x1024, rounded
corners on black):

  assets/images/icon.png                      full square icon (black corners filled with the ground)
  assets/images/adaptive-icon-foreground.png  Android adaptive icon: mountain, path and flag on
                                              transparent, inside the central ~66 % safe area
  assets/images/adaptive-icon-background.png  Android adaptive icon: dark ground and aurora
  assets/images/adaptive-icon-monochrome.png  Android 13 themed icon: one-colour mountain and flag
  assets/images/splash.png                    the mountain symbol for the splash screen
  assets/images/notification-icon.png         96x96 white mountain and flag on transparent
  assets/images/favicon.png                   48x48 web favicon

Run again after changing the artwork (needs NumPy and OpenCV: pip install numpy opencv-python-headless):

    python3 scripts/make-app-icons.py
"""
import os

import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'assets', 'brand', 'waligo-app-icon.png')
OUT = os.path.join(ROOT, 'assets', 'images')
SIZE = 1024
SAFE = 0.66  # share of the adaptive icon the symbol fits in
CUT_COLOUR = 880  # the symbol's lowest row (where the path ends) for the icon and splash
CUT_NOTIFICATION = 740  # higher for the small notification shape
GROUND_BGR = (16, 20, 11)  # #0B1410, the splash and icon ground


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def fill_corners(im):
    """Fills the black outside the rounded corners with the ground, by inpainting from the inside."""
    h, w = im.shape[:2]
    dark = (im.max(axis=2) <= 12).astype(np.uint8)
    corner = np.zeros((h, w), np.uint8)
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        m = np.zeros((h + 2, w + 2), np.uint8)
        cv2.floodFill(dark.copy(), m, (x, y), 2, loDiff=0, upDiff=0, flags=4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
        corner |= m[1:-1, 1:-1]
    corner = cv2.dilate((corner > 0).astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
    return cv2.inpaint(im, corner, 9, cv2.INPAINT_TELEA)


def symbol_mask(im):
    """The mountain, its path and the flag, separated from the sky with GrabCut from rough hints."""
    h, w = im.shape[:2]
    b, g, r = [im[..., i].astype(int) for i in range(3)]
    yy = np.arange(h)[:, None]
    xx = np.arange(w)[None, :]
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    ridge = np.array([[0, 840], [150, 640], [300, 500], [440, 400], [525, 340], [620, 420], [740, 470], [880, 600], [1024, 800], [1024, 1024], [0, 1024]], np.int32)
    cv2.fillPoly(mask, [ridge], cv2.GC_PR_FGD)
    mask[:230, :] = cv2.GC_BGD
    sky = [
        [[0, 0], [480, 0], [480, 300], [300, 420], [120, 560], [0, 700]],
        [[1024, 0], [600, 0], [600, 330], [760, 420], [900, 520], [1024, 680]],
        [[536, 338], [730, 335], [730, 470], [648, 458], [608, 428]],
        [[505, 335], [370, 335], [370, 440], [425, 438], [472, 392]],
    ]
    cv2.fillPoly(mask, [np.array(p, np.int32) for p in sky], cv2.GC_BGD)
    path = (g > 150) & (g > r + 60) & (b < 200) & (yy > 340)
    # Near the peak the path is a narrow column; brighter green beside it is aurora glow.
    path &= ~((yy < 470) & ((xx > 556) | (xx < 500)))
    flag = (r > 180) & (g > 120) & (b < 90)
    mask[path | flag] = cv2.GC_FGD
    cv2.fillPoly(mask, [np.array([[440, 600], [600, 600], [700, 900], [350, 900]], np.int32)], cv2.GC_FGD)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(im, mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8))
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    fg = (((lab == big) | flag) * 255).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return fg, (path * 255).astype(np.uint8)


def bottom_fade_weights(height, top, bottom, share=0.32):
    """1 above the symbol's lowest `share`, falling to 0 at its flat bottom edge."""
    start = bottom - (bottom - top) * share
    ys = np.arange(height, dtype=np.float32)[:, None]
    return np.where(ys >= start, np.clip((bottom - ys) / max(1.0, bottom - start), 0, 1), 1)


def place(rgba, box, size=SIZE, share=SAFE):
    """Scales the `box` (x0, y0, x1, y1) part of an RGBA image to fit in `share` of a square canvas, centred."""
    x0, y0, x1, y1 = box
    part = rgba[y0:y1, x0:x1]
    s = share * size / max(x1 - x0, y1 - y0)
    part = cv2.resize(part, (round((x1 - x0) * s), round((y1 - y0) * s)), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((size, size, 4), np.uint8)
    ox = (size - part.shape[1]) // 2
    oy = (size - part.shape[0]) // 2
    canvas[oy:oy + part.shape[0], ox:ox + part.shape[1]] = part
    return canvas


def main():
    src = cv2.imread(SRC)
    assert src.shape[:2] == (SIZE, SIZE), 'the artwork must be 1024x1024'
    full = fill_corners(src)
    cv2.imwrite(os.path.join(OUT, 'icon.png'), full)
    cv2.imwrite(os.path.join(OUT, 'favicon.png'), cv2.resize(full, (48, 48), interpolation=cv2.INTER_AREA))

    fg, path = symbol_mask(full)
    # The mountain runs off the bottom of the artwork: cut the symbol a little above it (where the
    # path ends), and keep only the columns it still covers.
    fg[CUT_COLOUR:] = 0
    path[CUT_COLOUR:] = 0
    box = bbox(fg)
    soft = cv2.GaussianBlur(fg, (0, 0), 1.2)
    k = bottom_fade_weights(SIZE, box[1], box[3])
    faded = (soft * k).astype(np.uint8)
    # As it fades out, the colour sinks into the ground too, so no lighter band shows at its base.
    tinted = (full * k[..., None] + np.array(GROUND_BGR, np.float32) * (1 - k[..., None])).astype(np.uint8)

    # Adaptive icon, foreground: the symbol, its flat base fading out.
    symbol = np.dstack([tinted, faded])
    cv2.imwrite(os.path.join(OUT, 'adaptive-icon-foreground.png'), place(symbol, box))

    # Adaptive icon, background: the aurora sky with the symbol painted out and softened, sinking
    # into the plain dark ground lower down (where the mountain was).
    hole = cv2.dilate(fg, np.ones((25, 25), np.uint8))
    ground = cv2.inpaint(full, hole, 15, cv2.INPAINT_TELEA)
    ground = cv2.GaussianBlur(ground, (0, 0), 18).astype(np.float32)
    ys = np.arange(SIZE, dtype=np.float32)[:, None, None]
    k = np.clip((ys - 520) / 260, 0, 1)
    ground = (ground * (1 - k) + np.array(GROUND_BGR, np.float32) * k).astype(np.uint8)
    cv2.imwrite(os.path.join(OUT, 'adaptive-icon-background.png'), ground)

    # Themed icon: one colour, crisp edges; the path is cut out of the mountain so it still reads.
    cut = cv2.dilate(path, np.ones((3, 3), np.uint8))
    mono_alpha = np.where(cut > 0, 0, soft).astype(np.uint8)
    white = np.full((SIZE, SIZE, 3), 255, np.uint8)
    cv2.imwrite(os.path.join(OUT, 'adaptive-icon-monochrome.png'), place(np.dstack([white, mono_alpha]), box))

    # Splash: the symbol alone, trimmed, for a dark screen.
    x0, y0, x1, y1 = box
    splash = symbol[y0:y1, x0:x1]
    w = 800  # shown about 200 dp wide: enough for the densest screens
    cv2.imwrite(os.path.join(OUT, 'splash.png'), cv2.resize(splash, (w, round(splash.shape[0] * w / splash.shape[1])), interpolation=cv2.INTER_AREA))

    # Notification: a solid white mountain and flag (Android tints it), crisp, on transparent; cut
    # higher so the small shape is the peaks, not a wide base.
    top = fg.copy()
    top[CUT_NOTIFICATION:] = 0
    solid = np.dstack([white, top])
    small = place(solid, bbox(top), size=384, share=0.86)
    small = cv2.resize(small, (96, 96), interpolation=cv2.INTER_AREA)
    small[..., :3] = 255
    cv2.imwrite(os.path.join(OUT, 'notification-icon.png'), small)


if __name__ == '__main__':
    main()
