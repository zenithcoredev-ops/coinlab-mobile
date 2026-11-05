"use no memo";
// The widget library calls these as plain functions, so the React Compiler must not touch this file.
import { getLocales } from 'expo-localization';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import type { Language } from '@/i18n/translate';
import { MiningWidget, MiningWidgetName, WidgetSize } from './MiningWidget';
import { markDrawn } from './draw-cache';
import { buildWidgetModel, WidgetModel, widgetDrawKey } from './model';
import { isSignedOut, loadSnapshot } from './snapshot';
import { loadStoredSessionSteps, loadStoredSteps, stepsForToday, updateSessionSteps, updateTodaySteps } from './steps';
import { isWeatherEnabled, loadWeather, updateWeather, weatherForWidget } from './weather';

function deviceLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

/** The widget's model from everything saved. A broken snapshot still gives a "start mining" widget, never a blank one. */
export async function loadWidgetModel(now = Date.now()): Promise<WidgetModel> {
  const [snapshot, steps, sessionSteps, weatherOn, weather] = await Promise.all([
    loadSnapshot().catch(() => null),
    loadStoredSteps(),
    loadStoredSessionSteps(),
    isWeatherEnabled(),
    loadWeather(),
  ]);
  return buildWidgetModel(snapshot, now, deviceLanguage(), {
    stepsToday: stepsForToday(steps, new Date(now)),
    weather: weatherForWidget(weatherOn, weather, now),
    sessionSteps,
  });
}

export async function renderMiningWidget(name: string, size?: WidgetSize, model?: WidgetModel) {
  model ??= await loadWidgetModel();
  return <MiningWidget name={name === 'MiningLarge' ? 'MiningLarge' : 'MiningSmall'} model={model} size={size} />;
}

/**
 * Draws the widget from what's saved right away, then (on the periodic update, or when just added)
 * reads today's steps and the weather in the background and draws again if either changed. Taps
 * open the app (handled natively by OPEN_APP).
 */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  // Always drawn here, even if unchanged: after a reboot or launcher restart this is what fills the widget.
  const model = await loadWidgetModel();
  renderWidget(await renderMiningWidget(widgetInfo.widgetName, widgetInfo, model));
  markDrawn(widgetDrawKey(model));
  if (widgetAction !== 'WIDGET_UPDATE' && widgetAction !== 'WIDGET_ADDED') return;
  const snapshot = await loadSnapshot().catch(() => null);
  const runningSince =
    snapshot && !isSignedOut(snapshot) && snapshot.endsAt && Date.parse(snapshot.endsAt) > Date.now() ? (snapshot.sessionStartedAt ?? null) : null;
  const [stepsChanged, sessionStepsChanged, weatherChanged] = await Promise.all([
    updateTodaySteps(new Date(), { background: true }),
    updateSessionSteps(new Date(), runningSince, { background: true }),
    updateWeather(Date.now()).catch(() => false),
  ]);
  if (stepsChanged || sessionStepsChanged || weatherChanged) {
    const updated = await loadWidgetModel();
    renderWidget(await renderMiningWidget(widgetInfo.widgetName, widgetInfo, updated));
    markDrawn(widgetDrawKey(updated));
  }
}

export const WIDGET_NAMES: MiningWidgetName[] = ['MiningSmall', 'MiningLarge'];
