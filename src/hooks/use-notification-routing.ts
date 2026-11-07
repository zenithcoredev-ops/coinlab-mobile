import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import type { NotificationRoute } from '@/lib/notification-plan';

const ROUTES: NotificationRoute[] = ['/(tabs)', '/(tabs)/league', '/(tabs)/tasks'];

/** The screen a tapped notification asks for, or null (not a tap, or no known route). */
export function routeOfResponse(response: Notifications.NotificationResponse | null | undefined): NotificationRoute | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const route = response.notification.request.content.data?.route;
  return ROUTES.includes(route as NotificationRoute) ? (route as NotificationRoute) : null;
}

/**
 * Opens the screen a tapped notification points to. Mounted inside the signed-in tabs, so a tap
 * that started the app waits until sign-in and onboarding are done; each tap is handled once.
 */
export function useNotificationRouting() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const route = routeOfResponse(response);
    if (!route) return;
    Notifications.clearLastNotificationResponse();
    router.navigate(route);
  }, [response, router]);
}
