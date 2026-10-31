import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { getWidgetInfo } from 'react-native-android-widget';

jest.mock('@react-native-async-storage/async-storage', () => ({}));
jest.mock('react-native-android-widget', () => ({ ...jest.requireActual('react-native-android-widget'), getWidgetInfo: jest.fn() }));

import { WidgetDiagnostics } from '../widget-diagnostics';

const setFlag = (flag?: string) => {
  if (flag === undefined) delete process.env.EXPO_PUBLIC_WIDGET_DIAGNOSTICS;
  else process.env.EXPO_PUBLIC_WIDGET_DIAGNOSTICS = flag;
};

beforeEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
  (getWidgetInfo as jest.Mock).mockImplementation(async (name: string) =>
    name === 'MiningLarge'
      ? [{ widgetName: name, widgetId: 7, width: 348, height: 180, sizeReport: 'widget=7 portrait=true min=392x110 max=392x180 sizes=[] drawn=348x180' }]
      : []
  );
});

describe('WidgetDiagnostics', () => {
  it('is hidden unless the preview build turned it on', () => {
    setFlag(undefined);
    render(<WidgetDiagnostics />);
    expect(screen.queryByText('Widget tanılama')).toBeNull();
  });

  it('shows what the launcher reported for each placed widget', async () => {
    setFlag('1');
    render(<WidgetDiagnostics />);
    fireEvent.press(screen.getByText('Boyutları göster'));
    await waitFor(() => expect(screen.getByText(/min=392x110/)).toBeTruthy());
    expect(screen.getByText(/not on the home screen/)).toBeTruthy();
  });
});
