import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { RootNavigator } from '@/components/root-navigator';
import { Pressable, Text } from 'react-native';

import { useMining } from '@/context/mining';
import { I18nProvider } from '@/i18n';
import { SessionProvider, useSession } from '@/context/session';
import TabsLayout from '../(tabs)/_layout';
import SignInScreen from '../index';
import Onboarding from '../onboarding';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
jest.mock('@/services/google-auth', () => ({
  signOutGoogle: jest.fn().mockResolvedValue(undefined),
  consumeGoogleRedirect: jest.fn().mockResolvedValue(null),
  signInWithGoogle: jest.fn(),
  describeGoogleError: jest.fn(),
}));
jest.mock('@/context/notifications', () => ({
  NotificationsProvider: ({ children }: any) => children,
  useNotifications: () => ({ active: false, setEnabled: jest.fn() }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

function Root() {
  return (
    <I18nProvider>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </I18nProvider>
  );
}


function Mine() {
  const { start, error } = useMining();
  const { signOut } = useSession();
  return (
    <>
      <Text>MINE-SCREEN</Text>
      <Pressable testID="start" onPress={start}><Text>start</Text></Pressable>
      <Pressable testID="signout" onPress={signOut}><Text>out</Text></Pressable>
      <Text testID="err">{error}</Text>
    </>
  );
}

const IDLE = { balance: '0', currentThs: 1, streak: 0, streakMinedToday: false, session: null, serverTime: new Date().toISOString() };
const SIGN_IN_TEXT = 'Sign in with Google';
const EXPIRED = { error: 'Invalid or expired token' };

function mockApi(onFetch: (path: string) => { status: number; body: unknown }) {
  globalThis.fetch = jest.fn(async (url: string) => {
    const path = new URL(String(url)).pathname;
    // A server without token refresh, so only the requests under test can fail.
    const { status, body } = path === '/auth/refresh' ? { status: 404, body: {} } : onFetch(path);
    return { ok: status < 300, status, headers: { get: () => null }, json: async () => body };
  }) as unknown as typeof fetch;
}

const AsyncStorage = require('@react-native-async-storage/async-storage');
const maxDepthErrors = () => (console.error as jest.Mock).mock.calls.filter((c) => String(c[0]).includes('Maximum update depth'));

describe('expired stored token', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem('coinlab_auth', JSON.stringify({ token: 'old', name: 'Kazim' }));
    jest.spyOn(console, 'error');
  });

  it('a 401 on start mining signs out once and shows the sign-in screen', async () => {
    mockApi((path) => {
      if (path === '/me') return { status: 200, body: { onboardingComplete: true } };
      if (path === '/mining/status') return { status: 200, body: IDLE };
      return { status: 401, body: EXPIRED };
    });
    renderRouter(
      {
        _layout: Root,
        index: SignInScreen,
        onboarding: Onboarding,
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': Mine,
      },
      { initialUrl: '/' }
    );
    await waitFor(() => expect(screen.getByText('MINE-SCREEN')).toBeTruthy(), { timeout: 4000 });
    await act(async () => {
      fireEvent.press(screen.getByTestId('start'));
    });
    await waitFor(() => expect(screen.getByText(SIGN_IN_TEXT)).toBeTruthy(), { timeout: 4000 });
    expect(await AsyncStorage.getItem('coinlab_auth')).toBeNull();
    expect(maxDepthErrors()).toHaveLength(0);
  });

  it('signing out from a mounted tab screen shows the sign-in screen', async () => {
    mockApi((path) => {
      if (path === '/me') return { status: 200, body: { onboardingComplete: true } };
      return { status: 200, body: IDLE };
    });
    renderRouter({ _layout: Root, index: SignInScreen, onboarding: Onboarding, '(tabs)/_layout': TabsLayout, '(tabs)/index': Mine }, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByText('MINE-SCREEN')).toBeTruthy(), { timeout: 4000 });
    await act(async () => {
      fireEvent.press(screen.getByTestId('signout'));
    });
    await waitFor(() => expect(screen.getByText(SIGN_IN_TEXT)).toBeTruthy(), { timeout: 4000 });
    expect(maxDepthErrors()).toHaveLength(0);
  });
});
