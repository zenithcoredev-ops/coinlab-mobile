jest.mock('@react-native-async-storage/async-storage', () => ({}));

import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';

import { translate } from '@/i18n/translate';
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

const rainy = { temperatureC: -2.6, symbol: 'lightrainshowers_night', isDay: false, updatedAt: '2026-10-19T08:00:00Z' };

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
const draw = (name: MiningWidgetName, model: ReturnType<typeof buildWidgetModel>, size?: WidgetSize) =>
  buildWidgetTree(<MiningWidget name={name} model={model} size={size} />) as unknown as Node;

const sizes: Record<MiningWidgetName, WidgetSize[]> = {
  MiningSmall: [
    { width: 110, height: 40 },
    { width: 150, height: 60 },
    { width: 180, height: 90 },
  ],
  MiningLarge: [
    { width: 250, height: 110 },
    { width: 300, height: 160 },
    { width: 360, height: 220 },
  ],
};
const NAMES = ['MiningSmall', 'MiningLarge'] as const;

describe('MiningWidget', () => {
  it('uses the same clock marker as the patched native library', () => {
    const patches = join(__dirname, '../../../patches');
    const patch = readdirSync(patches).find((f) => f.startsWith('react-native-android-widget+'));
    expect(readFileSync(join(patches, patch!), 'utf8')).toContain(`TEXT_PREFIX = "${CLOCK_PREFIX}"`);
  });

  it('draws the card centred, smaller than the reported size, so a launcher that shows less never cuts an edge', () => {
    for (const name of NAMES) {
      const root = draw(name, buildWidgetModel(snap, t0 + HOUR), { width: 300, height: 160 });
      expect(root.props.gravity & 0x11).toBe(0x11); // Gravity.CENTER_HORIZONTAL | CENTER_VERTICAL
      expect(root.children![0].props.width).toBe(300 - 16);
    }
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

  it('shows a live clock; the large widget adds the date', () => {
    const model = buildWidgetModel(snap, t0 + HOUR);
    expect(clocks(draw('MiningSmall', model))).toEqual([expect.objectContaining({ format24Hour: 'HH:mm', format12Hour: 'h:mm' })]);
    expect(clocks(draw('MiningLarge', model))).toEqual([
      expect.objectContaining({ format24Hour: 'HH:mm', bold: true }),
      expect.objectContaining({ format24Hour: 'EEEE, d MMMM', bold: false }),
    ]);
  });

  it.each(NAMES)('%s shows how long the running session has left', (name) => {
    expect(texts(draw(name, buildWidgetModel(snap, t0 + HOUR)))).toContain('Kazılıyor · 9sa kaldı');
    expect(texts(draw(name, buildWidgetModel(snap, t0 + 9.5 * HOUR)))).toContain('Kazılıyor · 30dk kaldı');
    expect(texts(draw(name, buildWidgetModel({ ...snap, language: 'en' }, t0 + HOUR)))).toContain('Mining · 9h left');
  });

  it.each(NAMES)('%s invites to start mining when idle, finished or never opened', (name) => {
    const start = translate('tr', 'widget.tapToStart');
    expect(texts(draw(name, buildWidgetModel(null, 0, 'tr')))).toContain(start);
    expect(texts(draw(name, buildWidgetModel({ ...snap, endsAt: null }, t0)))).toContain(start);
    expect(texts(draw(name, buildWidgetModel(snap, t0 + 11 * HOUR)))).toContain(start);
  });

  it.each(NAMES)('%s keeps the clock and asks to sign in when signed out', (name) => {
    const tree = draw(name, buildWidgetModel({ signedOut: true, language: 'tr' }, 0));
    expect(texts(tree)).toContain('Giriş yapmak için dokun');
    expect(clocks(tree).length).toBeGreaterThan(0);
  });

  it('shows today\'s steps with a ring on the large widget, only when Health Connect gave a count', () => {
    const tree = draw('MiningLarge', buildWidgetModel(snap, t0 + HOUR, 'tr', { stepsToday: 6240 }), { width: 300, height: 160 });
    expect(texts(tree)).toEqual(expect.arrayContaining(['6.240 adım', 'Bugün', 'CoinLab']));
    const ring = walk(tree).find((n) => n.type === 'SvgWidget')!;
    expect(ring.props.svgString).toContain('stroke-dasharray');
    expect(texts(draw('MiningLarge', buildWidgetModel({ ...snap, language: 'en' }, t0 + HOUR, 'en', { stepsToday: 6240 })))).toContain('6,240 steps');

    expect(walk(draw('MiningLarge', buildWidgetModel(snap, t0 + HOUR))).some((n) => n.type === 'SvgWidget')).toBe(false);
    expect(walk(draw('MiningSmall', buildWidgetModel(snap, t0 + HOUR, 'tr', { stepsToday: 6240 }))).some((n) => n.type === 'SvgWidget')).toBe(false);
  });

  it('shows the weather (icon + °C) top right on the large widget, only when there is some', () => {
    const tree = draw('MiningLarge', buildWidgetModel(snap, t0 + HOUR, 'tr', { weather: rainy }), { width: 300, height: 160 });
    expect(texts(tree)).toContain('-3°');
    const top = tree.children![0].children![0];
    expect(top.props.orientation).toBe('HORIZONTAL');
    expect(walk(top.children![1]).some((n) => n.type === 'SvgWidget')).toBe(true);
    expect(texts(draw('MiningLarge', buildWidgetModel(snap, t0 + HOUR)))).not.toContain('-3°');
    expect(texts(draw('MiningSmall', buildWidgetModel(snap, t0 + HOUR, 'tr', { weather: rainy })))).not.toContain('-3°');
  });

  it.each(NAMES)('%s never cuts text off and fits inside the card at every size', (name) => {
    const extras = [{}, { stepsToday: 12_345 }, { stepsToday: 12_345, weather: rainy }];
    for (const [size, extra] of sizes[name].flatMap((sz) => extras.map((e) => [sz, e] as const))) {
      const card = draw(name, buildWidgetModel(snap, t0 + HOUR, 'tr', extra), size).children![0];
      expect(card.props.width).toBeLessThan(size.width);
      expect(card.props.height).toBeLessThan(size.height);
      const innerW = card.props.width - card.props.padding.left - card.props.padding.right;
      const innerH = card.props.height - card.props.padding.top - card.props.padding.bottom;

      // Every text is one line in a fixed box that shrinks the font to fit, never an ellipsis.
      for (const node of textNodes(card)) {
        expect(node.props).toMatchObject({ maxLines: 1, adjustsFontSizeToFit: true });
        expect(node.props.truncate).toBeUndefined();
        expect(node.props.height).toBeGreaterThan(0);
        expect(node.props.width).toBeLessThanOrEqual(innerW);
      }
      // Rows don't overflow sideways, and the stacked blocks fit the card's height.
      for (const node of walk(card)) {
        if (node.props.orientation === 'HORIZONTAL') {
          const total = (node.children ?? []).reduce((sum, child) => sum + (child.props.width ?? 0), 0);
          expect(total).toBeLessThanOrEqual(node.props.width);
        }
      }
      const blockHeight = (n: Node): number =>
        typeof n.props.height === 'number'
          ? n.props.height
          : n.props.orientation === 'HORIZONTAL'
            ? Math.max(0, ...(n.children ?? []).map(blockHeight))
            : (n.children ?? []).reduce((sum, child) => sum + blockHeight(child), 0);
      expect(card.children!.reduce((sum, child) => sum + blockHeight(child), 0)).toBeLessThanOrEqual(innerH);
    }
  });
});
