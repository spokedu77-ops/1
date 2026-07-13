'use client';

import { useEffect, useState } from 'react';

const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'teacher_materials_access_cache_v1';

type AccessState = 'loading' | 'allowed' | 'denied' | 'no-session';

type CheckResponse = {
  allowed?: boolean;
  reason?: 'no-session' | 'inactive_teacher';
};

type CacheEntry = { allowed: boolean; ts: number };

let memCache: CacheEntry | null = null;

function readStorageCache(): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { allowed?: unknown; ts?: unknown };
    if (typeof parsed?.allowed !== 'boolean') return null;
    if (typeof parsed?.ts !== 'number') return null;
    return { allowed: parsed.allowed, ts: parsed.ts };
  } catch {
    return null;
  }
}

function writeStorageCache(next: CacheEntry) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage unavailable in some browser modes
  }
}

/** 종료 강사 자료 접근 차단 여부 (공지·커리큘럼·SPOMOVE) */
export function useTeacherMaterialsAccess(): AccessState {
  const [state, setState] = useState<AccessState>('loading');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const now = Date.now();
      if (memCache && now - memCache.ts < CACHE_TTL_MS) {
        if (!cancelled) setState(memCache.allowed ? 'allowed' : 'denied');
        return;
      }

      const stored = readStorageCache();
      if (stored && now - stored.ts < CACHE_TTL_MS) {
        memCache = stored;
        if (!cancelled) setState(stored.allowed ? 'allowed' : 'denied');
        return;
      }

      try {
        const res = await fetch('/api/auth/check-teacher-materials', { credentials: 'include' });
        const json = (await res.json()) as CheckResponse;
        const allowed = json.allowed === true;
        const entry = { allowed, ts: Date.now() };
        memCache = entry;
        writeStorageCache(entry);
        if (!cancelled) {
          if (json.reason === 'no-session') setState('no-session');
          else setState(allowed ? 'allowed' : 'denied');
        }
      } catch {
        if (!cancelled) setState('denied');
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** 관리자가 강사 종료/복구 토글 후 캐시 무효화용 */
export function invalidateTeacherMaterialsAccessCache() {
  memCache = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
