import app from '../../app.json';

/**
 * The app icon set (built by scripts/make-app-icons.py from assets/brand/waligo-app-icon.png): every
 * file app.json points at exists, has the size and transparency its platform expects, the icon has
 * no black corners, and the notification icon is white on transparent (Android draws it as a mask).
 */

const fs = require('fs') as { existsSync(f: string): boolean; readFileSync(f: string): Uint8Array };
const zlib = require('zlib') as { inflateSync(b: Uint8Array): Uint8Array };

type Png = { width: number; height: number; channels: number; pixel(x: number, y: number): number[] };

const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

/** A small decoder for the 8-bit, non-interlaced RGB / RGBA PNGs the icon script writes. */
function readPng(file: string): Png {
  const b = fs.readFileSync(file);
  expect(Array.from(b.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  let i = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Uint8Array[] = [];
  while (i < b.length) {
    const len = u32(b, i);
    const type = String.fromCharCode(...Array.from(b.slice(i + 4, i + 8)));
    const data = b.slice(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      width = u32(data, 0);
      height = u32(data, 4);
      expect(data[8]).toBe(8); // bit depth
      colorType = data[9];
      expect(data[12]).toBe(0); // not interlaced
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : 0;
  expect(channels).toBeGreaterThan(0);
  const joined = new Uint8Array(idat.reduce((n, d) => n + d.length, 0));
  idat.reduce((o, d) => (joined.set(d, o), o + d.length), 0);
  const raw = zlib.inflateSync(joined);
  const stride = width * channels;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let p = 0;
      if (filter === 1) p = a;
      else if (filter === 2) p = up;
      else if (filter === 3) p = (a + up) >> 1;
      else if (filter === 4) {
        const e = a + up - c;
        const [pa, pb, pc] = [Math.abs(e - a), Math.abs(e - up), Math.abs(e - c)];
        p = pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      out[y * stride + x] = (v + p) & 0xff;
    }
  }
  return { width, height, channels, pixel: (x, y) => Array.from(out.slice(y * stride + x * channels, y * stride + (x + 1) * channels)) };
}

const expo = app.expo;
const splash = expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, { image: string; backgroundColor: string }];
const notifications = expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-notifications') as [string, { icon: string }];
const path = (p: string) => p.replace(/^\.\//, '');

describe('app icons', () => {
  it('every icon and splash file app.json points at exists, and no Expo defaults are left', () => {
    for (const p of [
      expo.icon,
      expo.ios.icon,
      expo.web.favicon,
      expo.android.adaptiveIcon.foregroundImage,
      expo.android.adaptiveIcon.backgroundImage,
      expo.android.adaptiveIcon.monochromeImage,
      splash[1].image,
      notifications[1].icon,
    ]) {
      expect([p, fs.existsSync(path(p))]).toEqual([p, true]);
    }
    for (const old of ['assets/expo.icon', 'assets/images/splash-icon.png', 'assets/images/expo-logo.png', 'assets/images/android-icon-foreground.png']) {
      expect([old, fs.existsSync(old)]).toEqual([old, false]);
    }
    expect(splash[1].backgroundColor).toBe('#0B1410');
  });

  it('the icon is a full 1024 square: no black left in the corners', () => {
    const icon = readPng(path(expo.icon));
    expect([icon.width, icon.height]).toEqual([1024, 1024]);
    for (const [x, y] of [
      [0, 0],
      [1023, 0],
      [0, 1023],
      [1023, 1023],
      [30, 30],
    ]) {
      const [r, g, b] = icon.pixel(x, y);
      expect(r + g + b).toBeGreaterThan(15);
    }
  });

  it('the adaptive icon layers are 1024 squares; the foreground and themed layers are transparent around the symbol', () => {
    const a = expo.android.adaptiveIcon;
    for (const p of [a.foregroundImage, a.backgroundImage, a.monochromeImage]) {
      const png = readPng(path(p));
      expect([p, png.width, png.height]).toEqual([p, 1024, 1024]);
    }
    for (const p of [a.foregroundImage, a.monochromeImage]) {
      const png = readPng(path(p));
      expect(png.channels).toBe(4);
      // Outside the central 66 % safe area there is nothing.
      for (const [x, y] of [
        [100, 512],
        [924, 512],
        [512, 100],
        [512, 924],
        [0, 0],
      ]) {
        expect([p, x, y, png.pixel(x, y)[3]]).toEqual([p, x, y, 0]);
      }
      expect(png.pixel(512, 512)[3]).toBeGreaterThan(0);
    }
    // The themed icon is one colour.
    const mono = readPng(path(a.monochromeImage));
    for (let y = 0; y < 1024; y += 16) for (let x = 0; x < 1024; x += 16) if (mono.pixel(x, y)[3] > 0) expect(mono.pixel(x, y).slice(0, 3)).toEqual([255, 255, 255]);
  });

  it('the notification icon is a small white shape on transparent', () => {
    const png = readPng(path(notifications[1].icon));
    expect([png.width, png.height, png.channels]).toEqual([96, 96, 4]);
    let shown = 0;
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const [r, g, b, a] = png.pixel(x, y);
        if (a > 0) {
          shown++;
          expect([r, g, b]).toEqual([255, 255, 255]);
        }
      }
    }
    expect(png.pixel(0, 0)[3]).toBe(0);
    expect(shown).toBeGreaterThan(500);
  });
});
