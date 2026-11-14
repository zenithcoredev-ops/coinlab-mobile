#!/usr/bin/env python3
"""
Writes assets/backgrounds/brightness.json: for each tab picture, its size and, for 40 horizontal
bands top to bottom, the colour of its brightest pixels (the 99.5th percentile by luminance). The
contrast test (src/components/__tests__/background-contrast.test.ts) lays each tab's shade over these
colours and checks that text stays at WCAG AA. Run it again whenever a picture changes:

    python3 scripts/background-brightness.py

Needs Pillow and NumPy.
"""
import json
import os

import numpy as np
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'backgrounds')
FILES = ['home-bg.webp', 'tasks-bg.webp', 'league-bg.webp', 'friends-bg.webp', 'profile-bg.webp']
BANDS = 40


def lin(c):
    c = c / 255.0
    return np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def luminance(rgb):
    l = lin(rgb)
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]


def main():
    out = {}
    for name in FILES:
        path = os.path.join(DIR, name)
        im = Image.open(path).convert('RGB')
        arr = np.asarray(im, dtype=float)
        h = arr.shape[0]
        bands = []
        for b in range(BANDS):
            region = arr[int(b * h / BANDS):int((b + 1) * h / BANDS)].reshape(-1, 3)
            order = np.argsort(luminance(region))
            px = region[order[int(len(order) * 0.995)]]
            bands.append([int(round(v)) for v in px])
        out[name] = {'bytes': os.path.getsize(path), 'width': im.width, 'height': im.height, 'bands': bands}
    # One line per picture keeps the file short and its diffs readable.
    lines = ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v, separators=(",", ":"))}' for k, v in out.items())
    with open(os.path.join(DIR, 'brightness.json'), 'w') as f:
        f.write('{\n' + lines + '\n}\n')


if __name__ == '__main__':
    main()
