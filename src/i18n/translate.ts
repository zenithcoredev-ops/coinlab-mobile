import en, { PluralKey, TranslationKey } from './en';
import tr from './tr';

export type Language = 'en' | 'tr';
export type Translate = (key: TranslationKey | PluralKey, params?: Record<string, string | number>) => string;

export const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, tr };

/** Looks `key` up in `language`, falling back to English, and fills `{name}` placeholders. */
export function translate(
  language: Language,
  key: TranslationKey | PluralKey,
  params?: Record<string, string | number>
): string {
  const lookup = (k: string): string | undefined =>
    (dictionaries[language] as Record<string, string | undefined>)[k] ?? (en as Record<string, string | undefined>)[k];
  // `count` picks `key_one` / `key_other` when the key has plural forms; a plain key that also
  // takes `{count}` (e.g. "top {count} of {size}") is used as it is. Looking up `key_other` for a
  // plain key used to give undefined and crash the screen (the League tab).
  const plural = typeof params?.count === 'number' ? lookup(`${key}_${params.count === 1 ? 'one' : 'other'}`) : undefined;
  // Never undefined: an unknown key (say, a league index the app doesn't know yet) shows as itself.
  let text = plural ?? lookup(key) ?? String(key);
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
