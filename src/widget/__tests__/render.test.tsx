jest.mock('@react-native-async-storage/async-storage', () => ({}));

import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';

import { translate } from '@/i18n/translate';
import { MiningWidget, MiningWidgetName, WidgetSize } from '../MiningWidget';
import { buildWidgetModel } from '../model';
import type { WidgetSnapshot } from '../snapshot';

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

type Node = { type: string; props: any; children?: Node[] };
const walk = (node: any): Node[] =>
  typeof node === 'object' && node ? [node, ...(node.children ?? []).flatMap(walk)] : [];
const texts = (node: any) => walk(node).map((n) => n.props?.text).filter((t): t is string => typeof t === 'string');
const draw = (name: MiningWidgetName, model: ReturnType<typeof buildWidgetModel>, size?: WidgetSize) =>
  buildWidgetTree(<MiningWidget name={name} model={model} size={size} />) as unknown as Node;

const sizes: WidgetSize[] = [
  { width: 110, height: 40 },
  { width: 160, height: 80 },
  { width: 250, height: 110 },
  { width: 300, height: 160 },
];

describe('MiningWidget', () => {
  it.each(['MiningSmall', 'MiningLarge'] as const)('%s draws a start-mining prompt without a snapshot', (name) => {
    expect(texts(draw(name, buildWidgetModel(null, 0, 'tr')))).toContain(translate('tr', 'widget.tapToStart'));
  });

  it.each(['MiningSmall', 'MiningLarge'] as const)('%s shows only a sign-in prompt when signed out', (name) => {
    const model = buildWidgetModel({ signedOut: true, language: 'tr' }, 0);
    expect(texts(draw(name, model))).toEqual([translate('tr', 'widget.signedOut.hint')]);
    expect(translate('tr', 'widget.signedOut.hint')).toBe('Giriş yapmak için dokun');
  });

  it.each(['MiningSmall', 'MiningLarge'] as const)('%s never lays content out wider than the card inside the reported size', (name) => {
    for (const size of sizes) {
      const card = draw(name, buildWidgetModel(snap, t0 + HOUR), size).children![0];
      expect(card.props.width).toBeLessThan(size.width);
      expect(card.props.height).toBeLessThan(size.height);
      expect(card.props.borderRadius).toEqual({ topLeft: 20, topRight: 20, bottomLeft: 20, bottomRight: 20 });

      const inner = card.props.width - card.props.padding.left - card.props.padding.right;
      for (const node of walk(card).slice(1)) {
        if (typeof node.props.width === 'number') expect(node.props.width).toBeLessThanOrEqual(inner);
        if (node.props.orientation === 'HORIZONTAL') {
          const total = (node.children ?? []).reduce((sum, child) => sum + (child.props.width ?? 0), 0);
          expect(total).toBeLessThanOrEqual(node.props.width);
        }
      }
    }
  });

  it('keeps the large widget balanced: header, main block and footer', () => {
    // space-between adds weighted spacer nodes between the blocks; only the blocks have content.
    const blocks = (card: Node) => card.children!.filter((n) => texts(n).length > 0);
    const tall = draw('MiningLarge', buildWidgetModel(snap, t0 + HOUR), { width: 250, height: 160 }).children![0];
    expect(blocks(tall).map((b) => texts(b).length)).toEqual([2, 2, 2]); // header, time left + balance, streak + steps
    const short = draw('MiningLarge', buildWidgetModel(snap, t0 + HOUR), { width: 250, height: 110 }).children![0];
    expect(blocks(short).map((b) => texts(b).length)).toEqual([2, 1, 3]); // header, time left, balance + streak + steps
  });
});
