import type { Language } from '@/i18n/translate';

const MONTHS: Record<Language, string[]> = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** "Ekim 2026" / "October 2026" on the device's clock; null for a missing or broken date. */
export function formatMonthYear(iso: string | null | undefined, language: Language): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[language][d.getMonth()]} ${d.getFullYear()}`;
}
