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
    // Before Android 12 there is no size list; MIUI reports a min width as wide as the screen.
    expect(patch).toContain('SCREEN_SIDE_MARGIN_DP = 20');
    expect(patch).toContain('screenWidthDp - 2 * SCREEN_SIDE_MARGIN_DP');
    // The report the Profile's diagnostics show.
    expect(patch).toContain('widgetMap.putString("sizeReport", describeWidgetSize(context, id));');
  });

  it.each(NAMES)('%s draws a centred glass card with a gold→green edge, smaller than the reported size', (name) => {
    const root = draw(name, mining(), { width: 300, height: 160 });
    expect(root.props.gravity & 0x11).toBe(0x11); // Gravity.CENTER_HORIZONTAL | CENTER_VERTICAL
    const card = root.children![0];
    expect(card.type).toBe('FrameLayoutWidget');
    // The large widget spans the screen (its width is capped by the screen), so only a thin side margin.
    expect(card.props).toMatchObject({ width: 300 - (name === 'MiningLarge' ? 4 : 16), height: 160 - 16 });
    const frame = card.children![0].props.svgString as string;
    expect(frame).toContain('id="coinlab-card"');
    expect(frame).toContain('stop-color="#F5B942"'); // gold
    expect(frame).toContain('stop-color="#4ADE80"'); // green
    expect(frame).toMatch(/stop-opacity="0\.8\d?"/); // translucent fill
    expect(frame).not.toContain('<filter'); // AndroidSVG has no filters; glow is drawn with strokes
    // Thin, soft edge (a device showed the earlier stacked glow as a thick neon line).
    expect(frame).toMatch(/stroke="url\(#edge\)" stroke-opacity="0\.5" stroke-width="1"\/>/);
    expect(frame.match(/stroke="url\(#edge\)"/g)).toHaveLength(2); // the edge and one faint halo
    expect(frame).toContain('stroke-opacity="0.06"');
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
    const partly = { temperatureC: 16.2, symbol: 'partlycloudy_day', isDay: true, updatedAt: '2026-10-19T08:00:00Z' };
    const full = (extra = {}) => mining({ stepsToday: 1444, weather: partly, ...extra });
    const rows = (tree: Node) => {
      const content = tree.children![0].children![1];
      return content.children!.map((r) =>
        walk(r)
          .filter((n) => n.type === 'TextWidget' || n.type === 'SvgWidget')
          .map((n) =>
            n.type === 'SvgWidget'
              ? 'icon'
              : n.props.text.startsWith(CLOCK_PREFIX)
                ? JSON.parse(n.props.text.slice(CLOCK_PREFIX.length)).format24Hour
                : n.props.text
          )
      ).filter((r) => r.length > 0); // space-between adds empty spacer nodes between the rows
    };

    it('three rows: clock | weather, date | condition, steps | mining', () => {
      expect(rows(draw('MiningSmall', full(), { width: 260, height: 110 }))).toEqual([
        ['HH:mm', 'icon', '16°'],
        ['d MMM EEE', 'Parçalı bulutlu'],
        ['1.444 adım', 'Kazılıyor · 9sa'],
      ]);
    });

    it('as it narrows: the condition shortens, then goes, the date stays; clock, steps and mining always stay', () => {
      const at = (width: number, height = 110) => rows(draw('MiningSmall', full(), { width, height }));
      expect(at(260)[1]).toEqual(['d MMM EEE', 'Parçalı bulutlu']);
      expect(at(190)[1]).toEqual(['d MMM EEE', 'Parçalı']); // shortened
      expect(at(136)[1]).toEqual(['d MMM EEE']); // condition gone, the date takes the row
      expect(at(96)[1]).toEqual(['d MMM EEE']); // the narrowest card still has room for the date
      expect(at(260, 70)).toHaveLength(2); // the date's row only goes when there is no height for it
      for (const [width, height] of [[260, 110], [190, 110], [136, 110], [96, 110], [260, 70]]) {
        const r = at(width, height);
        expect(r[0][0]).toBe('HH:mm');
        expect(r[r.length - 1][0]).toBe('1.444 adım');
        expect(r[r.length - 1][1]).toMatch(/9sa$/);
      }
    });

    it('at the size seen on a Redmi Note 8 Pro shows all three rows and the full mining text', () => {
      // Its edge measured ~157x70dp on the screenshot, i.e. the launcher reports about 181x94dp.
      expect(rows(draw('MiningSmall', full(), { width: 181, height: 94 }))).toEqual([
        ['HH:mm', 'icon', '16°'],
        ['d MMM EEE', 'Parçalı'],
        ['1.444 adım', 'Kazılıyor · 9sa'],
      ]);
    });

    it('shows the start text when not mining, and no steps without a count', () => {
      expect(rows(draw('MiningSmall', mining({ stepsToday: 1444, weather: partly }, idle), { width: 260, height: 110 }))[2]).toEqual([
        '1.444 adım',
        'Kazımı başlat',
      ]);
      expect(rows(draw('MiningSmall', mining({ weather: partly }), { width: 260, height: 110 }))[2]).toEqual(['Kazılıyor · 9sa']);
    });

    it('too short for three rows: clock | weather and steps | mining; too short for two: clock | mining', () => {
      expect(rows(draw('MiningSmall', full(), { width: 260, height: 70 }))).toEqual([
        ['HH:mm', 'icon', '16°'],
        ['1.444 adım', 'Kazılıyor · 9sa'],
      ]);
      expect(rows(draw('MiningSmall', full(), { width: 110, height: 40 }))).toEqual([['HH:mm', '9sa']]);
    });

    it('draws no ring, pill or bar (plain text only)', () => {
      const pieces = art(draw('MiningSmall', full(), { width: 260, height: 110 }));
      expect(pieces).toEqual(['card', 'weather']);
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
