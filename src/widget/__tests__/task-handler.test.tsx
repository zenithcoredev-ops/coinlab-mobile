import { hasBackgroundStepsAccess, readTodaySteps } from '@/services/health-connect';
import { widgetTaskHandler } from '../widget-task-handler';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'tr' }] }));
jest.mock('@/services/health-connect', () => ({ hasBackgroundStepsAccess: jest.fn(), readTodaySteps: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const widgetInfo = { widgetName: 'MiningLarge', widgetId: 1, width: 300, height: 160, screenInfo: {} } as any;

beforeEach(async () => {
  await AsyncStorage.clear();
  (hasBackgroundStepsAccess as jest.Mock).mockResolvedValue(true);
  (readTodaySteps as jest.Mock).mockReset().mockResolvedValue(4321);
});

const stepCounts = (renderWidget: jest.Mock) =>
  renderWidget.mock.calls.map(([el]) => el.props.model.stepsToday);

describe('widgetTaskHandler', () => {
  it('draws right away, then reads steps on the periodic update and draws again', async () => {
    const renderWidget = jest.fn();
    await widgetTaskHandler({ widgetInfo, widgetAction: 'WIDGET_UPDATE', renderWidget } as any);
    expect(stepCounts(renderWidget)).toEqual([null, 4321]);
  });

  it('does not draw twice when the count is unchanged', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 30, 9, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      await widgetTaskHandler({ widgetInfo, widgetAction: 'WIDGET_UPDATE', renderWidget: jest.fn() } as any);
      jest.setSystemTime(new Date(2026, 9, 30, 9, 15)); // past the 10-minute gap, so Health Connect is read again
      const renderWidget = jest.fn();
      await widgetTaskHandler({ widgetInfo, widgetAction: 'WIDGET_UPDATE', renderWidget } as any);
      expect(readTodaySteps).toHaveBeenCalledTimes(2);
      expect(stepCounts(renderWidget)).toEqual([4321]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('only redraws on a resize, without touching Health Connect', async () => {
    const renderWidget = jest.fn();
    await widgetTaskHandler({ widgetInfo, widgetAction: 'WIDGET_RESIZED', renderWidget } as any);
    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(readTodaySteps).not.toHaveBeenCalled();
  });
});
