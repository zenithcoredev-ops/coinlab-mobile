import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';

import { CLOCK_PREFIX, MiningWidgetFallback } from '../MiningWidget';
import { buildWidgetModel } from '../model';
import { saveSnapshot } from '../snapshot';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'tr' }] }));
jest.mock('@/services/health-connect', () => ({ hasBackgroundStepsAccess: jest.fn().mockResolvedValue(false), readTodaySteps: jest.fn(), readVerifiedSteps: jest.fn() }));
jest.mock('@/services/weather-api', () => ({ getWeather: jest.fn() }));
// Stand-ins for the two ways the large layout has failed to draw: an error while building it (the
// steps ring throws), and a native error the library used to swallow (reported by getWidgetInfo).
let mockRingThrows = false;
jest.mock('../steps-ring', () => {
  const actual = jest.requireActual('../steps-ring');
  return { stepsRingSvg: (p: number) => (mockRingThrows ? (() => { throw new TypeError("Cannot read properties of undefined (reading 'toFixed')"); })() : actual.stepsRingSvg(p)) };
});
let mockDrawError: string | undefined;
const mockUpdateById = jest.fn().mockResolvedValue(undefined);
jest.mock('react-native-android-widget', () => ({
  ...jest.requireActual('react-native-android-widget'),
  getWidgetInfo: jest.fn(async () => [{ widgetName: 'MiningLarge', widgetId: 7, width: 330, height: 180, drawError: mockDrawError }]),
  requestWidgetUpdateById: (...a: unknown[]) => mockUpdateById(...a),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { loadWidgetError, renderMiningWidget, widgetTaskHandler, redrawFailedWidgets } = require('../widget-task-handler') as typeof import('../widget-task-handler');

type Node = { type: string; props: any; children?: Node[] };
const walk = (n: any): Node[] => (n && typeof n === 'object' ? [n, ...(n.children ?? []).flatMap(walk)] : []);
const texts = (tree: any) => walk(tree).filter((n) => n.type === 'TextWidget').map((n) => n.props.text as string);

const HOUR = 3_600_000;
const now = Date.now();
const snapshot = {
  language: 'tr' as const, balance: 3, ths: 1, clbPerHour: 0.13, streak: 4, streakAtRisk: false,
  endsAt: new Date(now + 10 * HOUR).toISOString(), steps: 2100, sessionStartedAt: new Date(now - HOUR).toISOString(), stepBonusClbPerHour: 0.01, savedAt: now,
};
const size = { width: 330, height: 180 };

beforeEach(async () => {
  await AsyncStorage.clear();
  mockRingThrows = false;
  mockDrawError = undefined;
  mockUpdateById.mockClear();
  await saveSnapshot(snapshot);
  await AsyncStorage.setItem('coinlab_widget_steps', JSON.stringify({ day: new Date().toDateString(), steps: 6240 }));
});

describe('large widget fallback', () => {
  it('the fallback shows the live clock and the collecting line, with none of the risky parts', () => {
    const tree = buildWidgetTree(<MiningWidgetFallback name="MiningLarge" model={buildWidgetModel(snapshot, now + 60_000, 'tr')} size={size} />) as any;
    const all = texts(tree);
    expect(all.some((t) => t.startsWith(CLOCK_PREFIX))).toBe(true);
    expect(all.some((t) => /^Toplanıyor/.test(t))).toBe(true);
    expect(walk(tree).some((n) => n.type === 'SvgWidget')).toBe(false);
  });

  it('when building the large layout throws, draws the fallback instead of nothing and keeps the error', async () => {
    mockRingThrows = true;
    const model = buildWidgetModel(snapshot, now + 60_000, 'tr', { stepsToday: 6240 });
    const el = await renderMiningWidget('MiningLarge', size, model);
    expect(el.type).toBe(MiningWidgetFallback);
    expect(await loadWidgetError()).toMatchObject({ widget: 'MiningLarge', where: 'js', message: expect.stringContaining('toFixed') });
  });

  it('when the native draw fails, the task handler draws the fallback over it', async () => {
    mockDrawError = 'java.lang.IllegalArgumentException: width and height must be > 0 at android.graphics.Bitmap.createBitmap:1113';
    const renderWidget = jest.fn();
    await widgetTaskHandler({ widgetInfo: { widgetName: 'MiningLarge', widgetId: 7, ...size }, widgetAction: 'WIDGET_RESIZED', renderWidget } as any);
    expect(renderWidget).toHaveBeenCalledTimes(2);
    expect(renderWidget.mock.calls[1][0].type).toBe(MiningWidgetFallback);
    expect(await loadWidgetError()).toMatchObject({ where: 'native', message: expect.stringContaining('IllegalArgumentException') });
  });

  it('after an in-app redraw, a widget whose draw failed gets the fallback', async () => {
    mockDrawError = 'java.lang.RuntimeException: boom';
    await redrawFailedWidgets(buildWidgetModel(snapshot, now, 'tr'));
    expect(mockUpdateById).toHaveBeenCalledWith(expect.objectContaining({ widgetName: 'MiningLarge', widgetId: 7 }));
  });

  it('draws the full layout when nothing fails', async () => {
    const renderWidget = jest.fn();
    await widgetTaskHandler({ widgetInfo: { widgetName: 'MiningLarge', widgetId: 7, ...size }, widgetAction: 'WIDGET_RESIZED', renderWidget } as any);
    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(renderWidget.mock.calls[0][0].type).not.toBe(MiningWidgetFallback);
  });
});
