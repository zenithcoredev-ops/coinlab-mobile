import { getCalendars } from 'expo-localization';

// Region/City names (and UTC). Rejects offsets like 'GMT+1', which some devices report instead.
const IANA_ZONE = /^(?:UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+)$/;

export function isIanaTimeZone(value: unknown): value is string {
  return typeof value === 'string' && IANA_ZONE.test(value);
}

/** The device's IANA time zone (e.g. 'Europe/Istanbul'), or null if it can't be read. */
export function deviceTimeZone(): string | null {
  const sources = [
    () => getCalendars()[0]?.timeZone,
    // Hermes' Intl may not know the zone; only a fallback.
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  for (const read of sources) {
    try {
      const zone = read();
      if (isIanaTimeZone(zone)) return zone;
    } catch {}
  }
  return null;
}

/**
 * The zone to send to the server, or null if nothing needs updating. `serverZone` is undefined
 * from servers that don't store a zone, and null for accounts that don't have one yet.
 */
export function timeZoneToSync(serverZone: string | null | undefined, device: string | null): string | null {
  if (serverZone === undefined || !device || device === serverZone) return null;
  return device;
}
