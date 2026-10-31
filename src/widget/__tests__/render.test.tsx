jest.mock('@react-native-async-storage/async-storage', () => ({}));

import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';

import { CLOCK_PREFIX, ClockSpec, MiningWidget, MiningWidgetName, WidgetSize } from '../MiningWidget';
import { buildWidgetModel } from '../model';
import type { WidgetSnapshot } from '../snapshot';

// Node built-ins, for reading the patch file (the app's tsconfig has no Node types).
declare const __dirname: string;
const { readdirSync, readFileSync } = require('fs') as {
  readdirSync: (dir: string) => string[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join } = require('path') as { join: (...parts: string[]) => string };

const HOUR = 3_600_000;
const t0 = Date.parse('2026-10-19T08:00:00Z');
const snap: WidgetSnapshot = {
  language: 'tr',
  balance: 1234.5,
  ths: 1,
  streak: 12,
  streakAtRisk: true,
  endsAt: new Date(t0 + 10 * HOUR).toISOString(),
  steps: 14800,
  savedAt: t0,
};
const idle: WidgetSnapshot = { ...snap, endsAt: null };
const rainy = { temperatureC: -2.6, symbol: 'lightrainshowers_night', isDay: false, updatedAt: '2026-10-19T08:00:00Z' };
const mining = (extras = {}, s: WidgetSnapshot = snap) => buildWidgetModel(s, t0 + HOUR, s.language, extras);

type Node = { type: string; props: any; children?: Node[] };
const walk = (node: any): Node[] =>
  typeof node === 'object' && node ? [node, ...(node.children ?? []).flatMap(walk)] : [];
const textNodes = (node: any) => walk(node).filter((n) => n.type === 'TextWidget');
const texts = (node: any) => textNodes(node).map((n) => n.props.text as string).filter((t) => !t.startsWith(CLOCK_PREFIX));
const clocks = (node: any): ClockSpec[] =>
  textNodes(node)
    .map((n) => n.props.text as string)
    .filter((t) => t.startsWith(CLOCK_PREFIX))
    .map((t) => JSON.parse(t.slice(CLOCK_PREFIX.length)));
/** The SVG pieces, by the id on their root element (coinlab-card, -ring, -pill-green, ...). */
const art = (node: any) =>
  walk(node)
    .filter((n) => n.type === 'SvgWidget')
    .map((n) => /<svg id="coinlab-([\w-]+)"/.exec(n.props.svgString)?.[1]);
const draw = (name: MiningWidgetName, model: ReturnType<typeof buildWidgetModel>, size?: WidgetSize) =>
  buildWidgetTree(<MiningWidget name={name} model={model} size={size} />) as unknown as Node;

const sizes: Record<MiningWidgetName, WidgetSize[]> = {
  MiningSmall: [
    { width: 110, height: 40 },
    { width: 120, height: 90 },
    { width: 200, height: 60 },
    { width: 180, height: 90 },
    { width: 260, height: 110 },
  ],
  MiningLarge: [
    { width: 250, height: 110 },
    { width: 300, height: 160 },
    { width: 360, height: 220 },
    { width: 420, height: 260 },
  ],
};
const NAMES = ['MiningSmall', 'MiningLarge'] as const;

describe('MiningWidget', () => {
  it('uses the same clock marker as the patched native library', () => {
    const patches = join(__dirname, '../../../patches');
    const patch = readdirSync(patches).find((f) => f.startsWith('react-native-android-widget+'));
    expect(readFileSync(join(patches, patch!), 'utf8')).toContain(`TEXT_PREFIX = "${CLOCK_PREFIX}"`);
  });

  it('sizes the bitmap by the narrowest width the launcher reports, and logs every reported size', () => {
    const patches = join(__dirname, '../../../patches');
    const patch = readFileSync(join(patches, readdirSync(patches).find((f) => f.startsWith('react-native-android-widget+'))!), 'utf8');
    expect(patch).toContain('AppWidgetManager.OPTION_APPWIDGET_SIZES');
    expect(patch).toContain('Math.min(width');
    // The typed Bundle getter only exists from Android 13; Android 12 must use the untyped one.
    expect(patch).toContain('Build.VERSION_CODES.TIRAMISU');
    expect(patch).toContain('Log.i("RNWidgetSize"');
  });

  it.each(NAMES)('%s draws a centred glass card with a gold→green edge, smaller than the reported size', (name) => {
    const root = draw(name, mining(), { width: 300, height: 160 });
    expect(root.props.gravity & 0x11).toBe(0x11); // Gravity.CENTER_HORIZONTAL | CENTER_VERTICAL
    const card = root.children![0];
    expect(card.type).toBe('FrameLayoutWidget');
    expect(card.props).toMatchObject({ width: 300 - 16, height: 160 - 16 });
    const frame = card.children![0].props.svgString as string;
    expect(frame).toContain('id="coinlab-card"');
    expect(frame).toContain('stop-color="#F5B942"'); // gold
    expect(frame).toContain('stop-color="#4ADE80"'); // green
    expect(frame).toMatch(/stop-opacity="0\.8\d?"/); // translucent fill
    expect(frame).not.toContain('<filter'); // AndroidSVG has no filters; glow is drawn with strokes
  });

  describe('large', () => {
    const big = { width: 420, height: 260 };

    it('shows the clock and "30 Ekim Cuma"-style date, weather with its condition, the steps ring and the mining label', () => {
      const tree = draw('MiningLarge', mining({ stepsToday: 348, weather: rainy }), big);
      expect(clocks(tree)).toEqual([
        expect.objectContaining({ format24Hour: 'HH:mm', bold: true }),
        expect.objectContaining({ format24Hour: 'd MMMM EEEE' }),
      ]);
      expect(texts(tree)).toEqual(['-3°', 'Hafif yağışlı', '348', 'adım', 'Bugün', 'Kazılıyor · 9sa kaldı', 'CoinLab']);
      expect(art(tree)).toEqual(['card', 'weather', 'ring', 'pill-green', undefined, 'progress']); // undefined: the gem
    });

    it('draws the session progress under the label while mining, and a gold label otherwise', () => {
      const bar = walk(draw('MiningLarge', mining(), big)).find((n) => /coinlab-progress/.test(n.props.svgString ?? ''))!;
      expect(bar.props.svgString).toContain('data-progress="0.63"'); // 9h left of 24h
      const start = draw('MiningLarge', mining({}, idle), big);
      expect(texts(start)).toContain('Kazımı başlatmak için dokun');
      expect(art(start)).toContain('pill-gold');
      expect(art(start)).not.toContain('progress');
      expect(texts(draw('MiningLarge', buildWidgetModel({ signedOut: true, language: 'tr' }, 0), big))).toContain('Giriş yapmak için dokun');
    });

    it('drops what does not fit, in order: condition, brand, bar, "Bugün", "adım"; never the clock, count or label', () => {
      const at = (width: number, height: number) => texts(draw('MiningLarge', mining({ stepsToday: 348, weather: rainy }), { width, height }));
      expect(at(420, 260)).toEqual(expect.arrayContaining(['Hafif yağışlı', 'CoinLab', 'adım', 'Bugün']));
      expect(at(250, 200)).not.toContain('Hafif yağışlı'); // narrow: weather is icon + temperature only
      const smallest = at(250, 110);
      expect(smallest).toEqual(expect.arrayContaining(['348', 'Kazılıyor · 9sa kaldı']));
      expect(smallest).not.toEqual(expect.arrayContaining(['CoinLab']));
      expect(smallest).not.toContain('Bugün');
      expect(smallest).not.toContain('adım');
    });

    it('leaves out the ring without a step count and the weather when there is none', () => {
      const tree = draw('MiningLarge', mining(), big);
      expect(art(tree)).not.toContain('ring');
      expect(art(tree)).not.toContain('weather');
      expect(texts(tree)).toContain('Kazılıyor · 9sa kaldı');
    });
  });

  describe('small', () => {
    it('two rows: clock and weather on top; short date and a short label with the session bar below', () => {
      const tree = draw('MiningSmall', mining({ weather: rainy }), { width: 260, height: 110 });
      expect(clocks(tree)).toEqual([
        expect.objectContaining({ format24Hour: 'HH:mm' }),
        expect.objectContaining({ format24Hour: 'd MMM EEE' }),
      ]);
      expect(texts(tree)).toEqual(['-3°', 'Kazılıyor · 9sa']);
      expect(art(tree)).toEqual(['card', 'weather', 'pill-green', undefined, 'progress']);
    });

    it('drops the date first, then the weather; the clock and the label always stay', () => {
      const at = (width: number) => draw('MiningSmall', mining({ weather: rainy }), { width, height: 90 });
      expect(clocks(at(180)).map((c) => c.format24Hour)).toEqual(['HH:mm']); // no date
      expect(texts(at(180))).toEqual(['-3°', 'Kazılıyor · 9sa']);
      expect(texts(at(120))).toEqual(['9sa']); // no weather; label shortened to fit
      expect(clocks(at(120)).map((c) => c.format24Hour)).toEqual(['HH:mm']);
    });

    it('one row when short: clock and label', () => {
      const tree = draw('MiningSmall', mining({ weather: rainy }), { width: 200, height: 60 });
      expect(clocks(tree).map((c) => c.format24Hour)).toEqual(['HH:mm']);
      expect(texts(tree)).toEqual(['Kazılıyor · 9sa']);
      expect(texts(draw('MiningSmall', mining({}, idle), { width: 110, height: 40 }))).toEqual(['Başlat']);
      expect(texts(draw('MiningSmall', mining({}, idle), { width: 200, height: 60 }))).toEqual(['Kazımı başlat']);
    });

    it('never shows steps (only the large widget does)', () => {
      expect(art(draw('MiningSmall', mining({ stepsToday: 348 }), { width: 260, height: 110 }))).not.toContain('ring');
    });
  });

  it('labels the session time in English too', () => {
    const en = { ...snap, language: 'en' as const };
    expect(texts(draw('MiningLarge', mining({}, en), { width: 420, height: 260 }))).toContain('Mining · 9h left');
    expect(texts(draw('MiningSmall', mining({}, en), { width: 260, height: 110 }))).toContain('Mining · 9h');
  });

  it.each(NAMES)('%s never cuts text off and fits inside the card at every size', (name) => {
    const extras = [{}, { stepsToday: 12_345 }, { stepsToday: 12_345, weather: rainy }];
    const states = [snap, idle];
    for (const size of sizes[name]) {
      for (const extra of extras) {
        for (const s of states) {
          const card = draw(name, buildWidgetModel(s, t0 + HOUR, 'tr', extra), size).children![0];
          const content = card.children![1];
          const innerW = content.props.width - content.props.padding.left - content.props.padding.right;
          const innerH = content.props.height - content.props.padding.top - content.props.padding.bottom;

          // Every text is one line in a fixed box that shrinks the font to fit, never an ellipsis.
          for (const node of textNodes(card)) {
            expect(node.props).toMatchObject({ maxLines: 1, adjustsFontSizeToFit: true });
            expect(node.props.truncate).toBeUndefined();
            expect(node.props.height).toBeGreaterThan(0);
            expect(node.props.width).toBeGreaterThan(0);
            expect(node.props.width).toBeLessThanOrEqual(innerW);
          }

          // Height a node takes: its own if set; overlapping layers take the tallest; rows the tallest; columns the sum.
          const used = (n: Node): number =>
            typeof n.props.height === 'number'
              ? n.props.height
              : n.type === 'FrameLayoutWidget' || n.props.orientation === 'HORIZONTAL'
                ? Math.max(0, ...(n.children ?? []).map(used))
                : (n.children ?? []).reduce((sum, child) => sum + used(child), 0);
          for (const node of walk(content)) {
            const kids = node.children ?? [];
            if (node.props.orientation === 'HORIZONTAL' && typeof node.props.width === 'number') {
              expect(kids.reduce((sum, k) => sum + (k.props.width ?? 0), 0)).toBeLessThanOrEqual(node.props.width);
            }
            if (node.props.orientation === 'VERTICAL' && typeof node.props.height === 'number' && node !== content) {
              expect(kids.reduce((sum, k) => sum + used(k), 0)).toBeLessThanOrEqual(node.props.height);
            }
          }
          expect((content.children ?? []).reduce((sum, k) => sum + used(k), 0)).toBeLessThanOrEqual(innerH);
        }
      }
    }
  });
});
