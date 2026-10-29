import * as Notifications from 'expo-notifications';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useI18n } from '@/i18n';

import {
  getPermissionState,
  loadNotificationsEnabled,
  PermissionState,
  requestPermission,
  saveNotificationsEnabled,
} from '@/services/notifications';

// Show reminders even if the app happens to be open when one fires.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type NotificationsState = {
  /** The user's switch (defaults to on). */
  preferred: boolean;
  permission: PermissionState;
  /** Reminders may fire: the user wants them and the OS allows them. */
  active: boolean;
  /** Turns reminders on (asking the OS if needed) or off. Resolves whether they ended up on. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
  refreshPermission: () => Promise<void>;
};

const Ctx = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [preferred, setPreferred] = useState(true);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const { language } = useI18n();

  const refreshPermission = useCallback(async () => {
    setPermission(await getPermissionState().catch(() => 'undetermined' as const));
  }, []);

  useEffect(() => {
    loadNotificationsEnabled().then(setPreferred);
    refreshPermission();
    // The user can change the permission in system settings while the app is backgrounded.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshPermission());
    return () => sub.remove();
  }, [refreshPermission]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      setPreferred(false);
      await saveNotificationsEnabled(false);
      return false;
    }
    const state = await requestPermission(language);
    setPermission(state);
    if (state !== 'granted') return false;
    setPreferred(true);
    await saveNotificationsEnabled(true);
    return true;
  }, [language]);

  const value = useMemo(
    () => ({ preferred, permission, active: preferred && permission === 'granted', setEnabled, refreshPermission }),
    [preferred, permission, setEnabled, refreshPermission]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
