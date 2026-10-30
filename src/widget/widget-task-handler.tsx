"use no memo";
// The widget library calls these as plain functions, so the React Compiler must not touch this file.
import { getLocales } from 'expo-localization';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import type { Language } from '@/i18n/translate';
import { MiningWidget, MiningWidgetName, WidgetSize } from './MiningWidget';
import { buildWidgetModel } from './model';
import { loadSnapshot } from './snapshot';
import { loadStoredSteps, stepsForToday, updateTodaySteps } from './steps';
import { isWeatherEnabled, loadWeather, updateWeather, weatherForWidget } from './weather';

function deviceLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

export async function renderMiningWidget(name: string, size?: WidgetSize) {
  // A broken snapshot must still leave a visible "start mining" widget, never a blank one.
  const now = Date.now();
  const [snapshot, steps, weatherOn, weather] = await Promise.all([
    loadSnapshot().catch(() => null),
    loadStoredSteps(),
    isWeatherEnabled(),
    loadWeather(),
  ]);
  const model = buildWidgetModel(snapshot, now, deviceLanguage(), {
    stepsToday: stepsForToday(steps, new Date(now)),
    weather: weatherForWidget(weatherOn, weather, now),
  });
  return <MiningWidget name={name === 'MiningLarge' ? 'MiningLarge' : 'MiningSmall'} model={model} size={size} />;
}

/**
 * Draws the widget from what's saved right away, then (on the periodic update, or when just added)
 * reads today's steps and the weather in the background and draws again if either changed. Taps
 * open the app (handled natively by OPEN_APP).
 */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(await renderMiningWidget(widgetInfo.widgetName, widgetInfo));
  if (widgetAction !== 'WIDGET_UPDATE' && widgetAction !== 'WIDGET_ADDED') return;
  const [stepsChanged, weatherChanged] = await Promise.all([
    updateTodaySteps(new Date(), { background: true }),
    updateWeather(Date.now()).catch(() => false),
  ]);
  if (stepsChanged || weatherChanged) {
    renderWidget(await renderMiningWidget(widgetInfo.widgetName, widgetInfo));
  }
}

export const WIDGET_NAMES: MiningWidgetName[] = ['MiningSmall', 'MiningLarge'];
