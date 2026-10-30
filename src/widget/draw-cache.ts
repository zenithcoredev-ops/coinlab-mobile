/**
 * What the app last asked the widgets to draw (see widgetDrawKey). In memory only: a fresh process
 * always draws once, and the widget's own periodic update always draws (after a reboot Android shows
 * the widget empty until then).
 */
let lastDrawn: string | null = null;

export function drawnKey(): string | null {
  return lastDrawn;
}

export function markDrawn(key: string | null): void {
  lastDrawn = key;
}
