import en, { TranslationKey } from './en';
import tr from './tr';

export type Language = 'en' | 'tr';
export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, tr };

/** Looks `key` up in `language`, falling back to English, and fills `{name}` placeholders. */
export function translate(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  let text = dictionaries[language][key] ?? en[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
