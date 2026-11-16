"use no memo";
// The widget library calls these as plain functions, so the React Compiler must not touch this file.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { getWidgetInfo, requestWidgetUpdateById } from 'react-native-android-widget';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';

import type { Language } from '@/i18n/translate';
import { MiningWidget, MiningWidgetFallback, MiningWidgetName, WidgetSize } from './MiningWidget';
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

/** Where the last widget drawing failure is kept, for the preview build's diagnostics. */
export const WIDGET_ERROR_KEY = 'coinlab_widget_error';
export type WidgetError = { widget: string; where: 'js' | 'native'; message: string; at: number };

async function recordWidgetError(widget: string, where: WidgetError['where'], message: string) {
  const entry: WidgetError = { widget, where, message: message.slice(0, 500), at: Date.now() };
  await AsyncStorage.setItem(WIDGET_ERROR_KEY, JSON.stringify(entry)).catch(() => {});
}

export async function loadWidgetError(): Promise<WidgetError | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_ERROR_KEY);
    return raw ? (JSON.parse(raw) as WidgetError) : null;
  } catch {
    return null;
  }
}

const widgetNameOf = (name: string): MiningWidgetName => (name === 'MiningLarge' ? 'MiningLarge' : 'MiningSmall');

/**
 * The widget to draw. The full layout is built once here first: if that throws, the simple fallback
 * (clock and collecting line) is drawn instead of nothing, and the error is kept for diagnostics.
 */
export async function renderMiningWidget(name: string, size?: WidgetSize, model?: WidgetModel) {
  model ??= await loadWidgetModel();
  const widget = widgetNameOf(name);
  const full = <MiningWidget name={widget} model={model} size={size} />;
  try {
    buildWidgetTree(full);
    return full;
  } catch (e) {
    await recordWidgetError(widget, 'js', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    return <MiningWidgetFallback name={widget} model={model} size={size} />;
  }
}

/**
 * Draws, then asks the native side whether that draw failed (the library swallows native errors and
 * the widget would stay blank; our patch keeps the reason). On a failure: the fallback instead.
 */
async function drawSafely(
  renderWidget: WidgetTaskHandlerProps['renderWidget'],
  info: { widgetName: string; widgetId: number },
  size: WidgetSize,
  model: WidgetModel
) {
  renderWidget(await renderMiningWidget(info.widgetName, size, model));
  const reports = (await getWidgetInfo(info.widgetName as MiningWidgetName).catch(() => [])) as { widgetId: number; drawError?: string }[];
  const failed = reports.find((r) => r.widgetId === info.widgetId)?.drawError;
  if (failed) {
    await recordWidgetError(info.widgetName, 'native', failed);
    renderWidget(<MiningWidgetFallback name={widgetNameOf(info.widgetName)} model={model} size={size} />);
  }
}

/**
 * After an in-app redraw: any placed widget whose last draw failed natively gets the fallback, so it
 * never stays blank. (A later redraw tries the full layout again.)
 */
export async function redrawFailedWidgets(model: WidgetModel): Promise<void> {
  for (const name of WIDGET_NAMES) {
    const reports = (await getWidgetInfo(name).catch(() => [])) as { widgetId: number; drawError?: string }[];
    for (const r of reports) {
      if (!r.drawError) continue;
      await recordWidgetError(name, 'native', r.drawError);
      await requestWidgetUpdateById({
        widgetName: name,
        widgetId: r.widgetId,
        renderWidget: (info) => <MiningWidgetFallback name={name} model={model} size={info} />,
      }).catch(() => {});
    }
  }
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
  await drawSafely(renderWidget, widgetInfo, widgetInfo, model);
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
    await drawSafely(renderWidget, widgetInfo, widgetInfo, updated);
    markDrawn(widgetDrawKey(updated));
  }
}

export const WIDGET_NAMES: MiningWidgetName[] = ['MiningSmall', 'MiningLarge'];
