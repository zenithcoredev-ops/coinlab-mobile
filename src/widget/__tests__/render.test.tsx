import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';

import { translate } from '@/i18n/translate';
import { MiningWidget } from '../MiningWidget';
import { buildWidgetModel } from '../model';

const texts = (node: any): string[] =>
  typeof node === 'object' && node
    ? [node.props?.text, ...(node.children ?? []).flatMap(texts)].filter((t): t is string => typeof t === 'string')
    : [];

describe('MiningWidget', () => {
  it.each(['MiningSmall', 'MiningLarge'] as const)('%s draws a start-mining prompt without a snapshot', (name) => {
    const tree = buildWidgetTree(<MiningWidget name={name} model={buildWidgetModel(null, 0, 'tr')} />);
    expect(texts(tree)).toContain(translate('tr', 'widget.tapToStart'));
  });
});
