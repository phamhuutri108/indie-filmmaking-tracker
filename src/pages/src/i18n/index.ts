import { en } from './en';
import { vi } from './vi';

export type Lang = 'en' | 'vi';

// Deep-map the translation shape to allow any string values
type DeepString<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown> ? DeepString<T[K]> : string;
};

export type I18n = DeepString<typeof en>;

export const translations: Record<Lang, I18n> = { en, vi };

export function useI18n(lang: Lang): I18n {
  return translations[lang] ?? en;
}

export { en, vi };
