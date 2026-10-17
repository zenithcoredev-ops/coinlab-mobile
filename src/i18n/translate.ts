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
  const resolved = (
    typeof params?.count === 'number' ? `${key}_${params.count === 1 ? 'one' : 'other'}` : key
  ) as TranslationKey;
  let text = dictionaries[language][resolved] ?? en[resolved];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
