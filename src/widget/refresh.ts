import { requestWidgetUpdate } from 'react-native-android-widget';

import { renderMiningWidget, WIDGET_NAMES } from './widget-task-handler';

/** Redraws every placed mining widget from the saved snapshot. */
export async function refreshWidgets(): Promise<void> {
  await Promise.all(
    WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: (widgetInfo) => renderMiningWidget(widgetName, widgetInfo) }).catch(() => {})
    )
  );
}
