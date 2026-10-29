import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useMining } from '@/context/mining';
import { useSession } from '@/context/session';
import { deviceTimeZone, timeZoneToSync } from '@/lib/timezone';
import { updateTimeZone } from '@/services/me-api';

/**
 * Tells the server when the device's time zone differs from the one it stores (first run, travel),
 * so the streak day and its expiry follow the user. At most one attempt per return to the app.
 */
export function useTimezoneSync() {
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const { status, refresh } = useMining();
  const serverZone = status?.timezone;
  const [foregrounds, setForegrounds] = useState(0);
  const checkedRef = useRef(-1);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setForegrounds((n) => n + 1));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!token || serverZone === undefined || checkedRef.current === foregrounds) return;
    checkedRef.current = foregrounds;
    const zone = timeZoneToSync(serverZone, deviceTimeZone());
    if (!zone) return;
    // The streak expiry depends on the zone, so pick up the server's recomputed status.
    updateTimeZone(token, zone)
      .then(() => refresh())
      .catch(() => {});
  }, [token, serverZone, foregrounds, refresh]);
}
