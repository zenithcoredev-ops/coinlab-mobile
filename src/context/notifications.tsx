import * as Notifications from 'expo-notifications';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useI18n } from '@/i18n';

import { ALL_TYPES_ON } from '@/lib/notification-plan';
import type { NotificationType, TypePrefs } from '@/lib/notification-plan';
import {
  getPermissionState,
  loadNotificationsEnabled,
  loadTypePrefs,
  PermissionState,
  requestPermission,
  saveNotificationsEnabled,
  saveTypePrefs,
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
  /** Which kinds of notification are wanted (Profile → one switch each). */
  typePrefs: TypePrefs;
  setTypeEnabled: (type: NotificationType, enabled: boolean) => Promise<void>;
};

const Ctx = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [preferred, setPreferred] = useState(true);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [typePrefs, setTypePrefs] = useState<TypePrefs>(ALL_TYPES_ON);
  // The latest choice, so quick taps on two switches never save over each other.
  const prefsRef = useRef<TypePrefs>(ALL_TYPES_ON);
  const { language } = useI18n();

  const refreshPermission = useCallback(async () => {
    setPermission(await getPermissionState().catch(() => 'undetermined' as const));
  }, []);

  useEffect(() => {
    loadNotificationsEnabled().then(setPreferred);
    loadTypePrefs().then((saved) => {
      prefsRef.current = saved;
      setTypePrefs(saved);
    });
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

  const setTypeEnabled = useCallback(async (type: NotificationType, enabled: boolean) => {
    const next = { ...prefsRef.current, [type]: enabled };
    prefsRef.current = next;
    setTypePrefs(next);
    await saveTypePrefs(next).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      preferred,
      permission,
      active: preferred && permission === 'granted',
      setEnabled,
      refreshPermission,
      typePrefs,
      setTypeEnabled,
    }),
    [preferred, permission, setEnabled, refreshPermission, typePrefs, setTypeEnabled]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
