import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { routeOfResponse, useNotificationRouting } from '../use-notification-routing';

const mockNavigate = jest.fn();
let mockResponse: unknown = null;
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));
jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  useLastNotificationResponse: () => mockResponse,
  clearLastNotificationResponse: jest.fn(),
}));

const tap = (route: unknown, actionIdentifier = 'expo.modules.notifications.actions.DEFAULT') =>
  ({ actionIdentifier, notification: { request: { content: { data: { route } } } } }) as unknown as Notifications.NotificationResponse;

beforeEach(() => {
  jest.clearAllMocks();
  mockResponse = null;
});

describe('routeOfResponse', () => {
  it('is the screen a tapped notification asks for', () => {
    expect(routeOfResponse(tap('/(tabs)/league'))).toBe('/(tabs)/league');
    expect(routeOfResponse(tap('/(tabs)/tasks'))).toBe('/(tabs)/tasks');
    expect(routeOfResponse(tap('/(tabs)'))).toBe('/(tabs)');
  });

  it('ignores anything else', () => {
    expect(routeOfResponse(null)).toBeNull();
    expect(routeOfResponse(undefined)).toBeNull();
    expect(routeOfResponse(tap('/somewhere'))).toBeNull();
    expect(routeOfResponse(tap(undefined))).toBeNull();
    expect(routeOfResponse(tap('/(tabs)/league', 'dismiss'))).toBeNull();
  });
});

describe('useNotificationRouting', () => {
  it('opens the screen once and clears the tap so it is not handled again', () => {
    mockResponse = tap('/(tabs)/league');
    renderHook(() => useNotificationRouting());
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/league');
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a tap', () => {
    renderHook(() => useNotificationRouting());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
