import type { UiLocale } from './constants';

/** 짧은 안정적인 캐시 키 (원문이 길어도 저장 키 길이 제한) */
export function translationCacheKey(locale: UiLocale, sourceText: string): string {
  const normalized = sourceText.trim();
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const unsigned = h >>> 0;
  return `${locale}:${unsigned.toString(16)}`;
}
