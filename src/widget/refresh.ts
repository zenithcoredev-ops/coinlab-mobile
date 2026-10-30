import { requestWidgetUpdate } from 'react-native-android-widget';

import { drawnKey, markDrawn } from './draw-cache';
import { widgetDrawKey } from './model';
import { loadWidgetModel, renderMiningWidget, WIDGET_NAMES } from './widget-task-handler';

/**
 * Redraws every placed mining widget from what's saved, unless it would draw exactly what it shows
 * now. The app calls this on every mining poll (each 30 s while open); drawing renders a bitmap, so
 * skipping unchanged ones saves battery. Resizes and the periodic update draw on their own.
 */
export async function refreshWidgets(): Promise<void> {
  const model = await loadWidgetModel();
  const key = widgetDrawKey(model);
  if (key === drawnKey()) return;
  markDrawn(key);
  await Promise.all(
    WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: (widgetInfo) => renderMiningWidget(widgetName, widgetInfo, model) }).catch(() => {})
    )
  );
}
