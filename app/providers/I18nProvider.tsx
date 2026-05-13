'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_UI_LOCALE,
  STORAGE_UI_LOCALE_KEY,
  TRANSLATION_CACHE_STORAGE_PREFIX,
  isUiLocale,
  uiLocaleToHtmlLang,
  type UiLocale,
} from '@/app/lib/i18n/constants';
import { translationCacheKey } from '@/app/lib/i18n/cacheKey';

const MAX_SOURCE_CHARS = 500;
const MAX_CACHED_ENTRIES_MEMORY = 2000;
const TRANSLATE_BACKOFF_MS = 60_000;
const TRANSLATION_ENABLED = false;

type CachedEntry = { source: string; text: string };

type I18nContextValue = {
  locale: UiLocale;
  setLocale: (next: UiLocale) => void;
  t: (source: string, stableKey?: string) => string;
  subscribe: (cb: () => void) => () => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readLocaleFromStorage(): UiLocale {
  if (typeof window === 'undefined') return DEFAULT_UI_LOCALE;
  try {
    const raw = window.localStorage.getItem(STORAGE_UI_LOCALE_KEY);
    if (isUiLocale(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_UI_LOCALE;
}

function readCacheFromStorage(locale: UiLocale, source: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = TRANSLATION_CACHE_STORAGE_PREFIX + translationCacheKey(locale, source);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (parsed && typeof parsed.text === 'string' && parsed.source === source.trim()) {
      return parsed.text;
    }
  } catch {
    // ignore
  }
  return null;
}

function writeCacheToStorage(locale: UiLocale, source: string, text: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = TRANSLATION_CACHE_STORAGE_PREFIX + translationCacheKey(locale, source);
    const payload: CachedEntry = { source: source.trim(), text };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useStateSafeLocale();
  const memoryRef = useRef<Map<string, string>>(new Map());
  const inflightRef = useRef<Set<string>>(new Set());
  const blockedUntilRef = useRef<number>(0);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const notify = useCallback(() => {
    listenersRef.current.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore listener errors
      }
    });
  }, []);

  const setLocale = useCallback((next: UiLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_UI_LOCALE_KEY, next);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = uiLocaleToHtmlLang(next);
    }
    notify();
  }, [notify, setLocaleState]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = uiLocaleToHtmlLang(locale);
    }
  }, [locale]);

  const getMemoryKey = useCallback((loc: UiLocale, source: string) => `${loc}\u0000${source.trim()}`, []);

  const getCached = useCallback(
    (loc: UiLocale, source: string): string | null => {
      if (loc === 'ko') return source;
      const mem = memoryRef.current.get(getMemoryKey(loc, source));
      if (mem) return mem;
      const disk = readCacheFromStorage(loc, source);
      if (disk) {
        memoryRef.current.set(getMemoryKey(loc, source), disk);
        if (memoryRef.current.size > MAX_CACHED_ENTRIES_MEMORY) {
          const first = memoryRef.current.keys().next().value;
          if (first) memoryRef.current.delete(first);
        }
      }
      return disk;
    },
    [getMemoryKey]
  );

  const runTranslate = useCallback(
    async (loc: UiLocale, source: string) => {
      const trimmed = source.trim();
      if (!trimmed || loc === 'ko') return;
      if (!TRANSLATION_ENABLED) return;
      if (Date.now() < blockedUntilRef.current) return;

      const memKey = getMemoryKey(loc, trimmed);
      const dedupeKey = `${loc}:${translationCacheKey(loc, source)}`;
      if (inflightRef.current.has(dedupeKey)) return;
      inflightRef.current.add(dedupeKey);

      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 12_000);
        const res = await fetch('/api/i18n/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          signal: controller.signal,
          body: JSON.stringify({
            sourceText: trimmed.slice(0, MAX_SOURCE_CHARS),
            targetLocale: loc,
          }),
        });
        window.clearTimeout(timer);

        if (res.status === 429) {
          blockedUntilRef.current = Date.now() + TRANSLATE_BACKOFF_MS;
          return;
        }
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; text?: string; error?: string };
        if (res.status === 503 && json?.error === 'translate_unconfigured') {
          blockedUntilRef.current = Date.now() + TRANSLATE_BACKOFF_MS;
          return;
        }
        if (!res.ok || !json.ok || typeof json.text !== 'string' || !json.text.trim()) {
          return;
        }
        const translated = json.text.trim();
        memoryRef.current.set(memKey, translated);
        writeCacheToStorage(loc, trimmed, translated);
        notify();
      } catch {
        // Keep the Korean source text on failure.
      } finally {
        inflightRef.current.delete(dedupeKey);
      }
    },
    [getMemoryKey, notify]
  );

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const t = useCallback(
    (source: string, stableKey?: string) => {
      void stableKey;
      if (locale === 'ko') return source;
      if (!TRANSLATION_ENABLED) return source;
      const cached = getCached(locale, source);
      if (cached) return cached;
      void runTranslate(locale, source);
      return source;
    },
    [getCached, locale, runTranslate]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, subscribe }),
    [locale, setLocale, t, subscribe]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useStateSafeLocale(): [UiLocale, (v: UiLocale) => void] {
  const [locale, setLocale] = useReducer((_: UiLocale, next: UiLocale) => next, DEFAULT_UI_LOCALE);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const stored = readLocaleFromStorage();
    if (stored !== DEFAULT_UI_LOCALE) {
      setLocale(stored);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = uiLocaleToHtmlLang(stored);
      }
    }
  }, []);

  return [locale, setLocale];
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

export function useTranslator(): (source: string, stableKey?: string) => string {
  const { t, subscribe } = useI18n();
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => subscribe(() => bump()), [subscribe]);

  return useCallback(
    (source: string, stableKey?: string) => t(source, stableKey),
    [t]
  );
}
