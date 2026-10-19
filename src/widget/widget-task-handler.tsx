import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { MiningWidget, MiningWidgetName } from './MiningWidget';
import { buildWidgetModel } from './model';
import { loadSnapshot } from './snapshot';

export async function renderMiningWidget(name: string) {
  const model = buildWidgetModel(await loadSnapshot(), Date.now());
  return <MiningWidget name={name === 'MiningLarge' ? 'MiningLarge' : 'MiningSmall'} model={model} />;
}

/** Draws the widget from the last snapshot; taps open the app (handled natively by OPEN_APP). */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(await renderMiningWidget(widgetInfo.widgetName));
}

export const WIDGET_NAMES: MiningWidgetName[] = ['MiningSmall', 'MiningLarge'];
