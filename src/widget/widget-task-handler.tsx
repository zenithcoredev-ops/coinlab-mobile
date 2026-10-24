"use no memo";
// The widget library calls these as plain functions, so the React Compiler must not touch this file.
import { getLocales } from 'expo-localization';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import type { Language } from '@/i18n/translate';
import { MiningWidget, MiningWidgetName, WidgetSize } from './MiningWidget';
import { buildWidgetModel } from './model';
import { loadSnapshot } from './snapshot';

function deviceLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

export async function renderMiningWidget(name: string, size?: WidgetSize) {
  // A broken snapshot must still leave a visible "start mining" widget, never a blank one.
  const model = buildWidgetModel(await loadSnapshot().catch(() => null), Date.now(), deviceLanguage());
  return <MiningWidget name={name === 'MiningLarge' ? 'MiningLarge' : 'MiningSmall'} model={model} size={size} />;
}

/** Draws the widget from the last snapshot; taps open the app (handled natively by OPEN_APP). */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(await renderMiningWidget(widgetInfo.widgetName, widgetInfo));
}

export const WIDGET_NAMES: MiningWidgetName[] = ['MiningSmall', 'MiningLarge'];
