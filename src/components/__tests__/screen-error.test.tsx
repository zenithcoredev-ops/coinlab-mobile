import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { ScreenError, shortError } from '../screen-error';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/i18n', () => ({ useI18n: () => ({ language: 'tr', t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }) }));

let mockBroken = true;
function Flaky() {
  if (mockBroken) throw new TypeError("Cannot read properties of undefined (reading 'split')");
  return <Text>Lig ekranı</Text>;
}

describe('tab error boundary', () => {
  beforeEach(() => {
    mockBroken = true;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows a retry screen instead of closing the app, and draws the screen again on retry', async () => {
    renderRouter({ index: { default: Flaky, ErrorBoundary: ScreenError } }, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByText('Bir sorun oluştu')).toBeTruthy());
    // Dev / test builds also show the error, short.
    expect(screen.getByTestId('screen-error-detail')).toHaveTextContent("TypeError: Cannot read properties of undefined (reading 'split')");

    mockBroken = false;
    fireEvent.press(screen.getByText('Tekrar dene'));
    await waitFor(() => expect(screen.getByText('Lig ekranı')).toBeTruthy());
  });

  it('cuts a long error to one short line', () => {
    const long = shortError(new Error('x'.repeat(500)));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith('…')).toBe(true);
    expect(shortError('plain\n  text')).toBe('Error: plain text');
  });
});

describe('every tab exports the error boundary', () => {
  it.each(['index', 'tasks', 'league', 'friends', 'profile'])('%s', (name) => {
    const source = require('fs').readFileSync(`src/app/(tabs)/${name}.tsx`, 'utf8') as string;
    expect(source).toContain("export { ScreenError as ErrorBoundary } from '@/components/screen-error';");
  });
});
