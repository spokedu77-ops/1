/** UI 언어 코드 (URL locale prefix 없이 저장/표시용) */
export type UiLocale = 'ko' | 'en' | 'ja' | 'es' | 'zh';

export const DEFAULT_UI_LOCALE: UiLocale = 'ko';

export const STORAGE_UI_LOCALE_KEY = 'spokedu_ui_locale';

/** localStorage 번역 캐시 키 prefix (버전 bump 시 캐시 무효화) */
export const TRANSLATION_CACHE_STORAGE_PREFIX = 'spokedu_i18n_cache_v1:';

export const SUPPORTED_LOCALES: readonly UiLocale[] = ['ko', 'en', 'ja', 'es', 'zh'] as const;

export const LOCALE_LABELS: Record<UiLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  es: 'Español',
  zh: '中文',
};

/** <html lang> BCP-47 */
export function uiLocaleToHtmlLang(locale: UiLocale): string {
  switch (locale) {
    case 'zh':
      return 'zh-Hans';
    default:
      return locale;
  }
}

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
