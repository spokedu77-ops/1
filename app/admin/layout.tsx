'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';

const CACHE_TTL = 5 * 60 * 1000;
const SLOW_CHECK_MS = 3000;
let cache: { admin: boolean; ts: number } | null = null;
const STORAGE_KEY = 'admin_check_cache_v1';
type AdminCheckResponse = {
  admin?: boolean;
  reason?: 'no-session' | 'forbidden' | 'server-error';
};

function readStorageCache(): { admin: boolean; ts: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { admin?: unknown; ts?: unknown };
    if (typeof parsed?.admin !== 'boolean') return null;
    if (typeof parsed?.ts !== 'number') return null;
    return { admin: parsed.admin, ts: parsed.ts };
  } catch {
    return null;
  }
}

function writeStorageCache(next: { admin: boolean; ts: number }) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // sessionStorage/모듈 캐시로 초기값을 true로 두면 SSR은 false·클라이언트는 true가 되어 hydration mismatch가 난다.
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkSlow, setCheckSlow] = useState(false);
  const isFullscreenRoute = pathname != null && pathname.startsWith('/admin/spokedu-pro');
  const isGameRoute =
    pathname != null &&
    (pathname.startsWith('/admin/memory-game') || pathname.startsWith('/admin/camera'));

  useEffect(() => {
    const slowTimer = setTimeout(() => setCheckSlow(true), SLOW_CHECK_MS);
    return () => clearTimeout(slowTimer);
  }, []);

  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      const mem = cache;
      if (mem && now - mem.ts < CACHE_TTL) {
        if (mem.admin) setIsAdmin(true);
        else router.replace('/teacher/my-classes');
        return;
      }
      const stored = readStorageCache();
      if (stored && now - stored.ts < CACHE_TTL) {
        if (stored.admin) setIsAdmin(true);
        else router.replace('/teacher/my-classes');
        return;
      }

      let res: Response, json: AdminCheckResponse;
      try {
        res = await fetch('/api/auth/check-admin', { credentials: 'include' });
        json = await res.json();
      } catch {
        router.replace('/login');
        return;
      }

      if (json.reason === 'server-error') {
        setCheckSlow(true);
        return;
      }

      cache = { admin: !!json.admin, ts: Date.now() };
      writeStorageCache(cache);

      if (json.admin) {
        setIsAdmin(true);
      } else {
        if (json.reason === 'no-session') router.replace('/login');
        else router.replace('/teacher/my-classes');
      }
    };
    check();
  }, [router]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-2">
        <p className="text-sm font-bold text-slate-300 animate-pulse">권한 확인 중...</p>
        {checkSlow && (
          <p className="text-xs text-slate-400">잠시 후 다시 시도해 주세요. 로그인 상태를 확인해 주세요.</p>
        )}
      </div>
    );
  }

  return (
    <main
      className={
        isFullscreenRoute
          ? 'flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-[#0F172A] text-gray-900 relative'
          : isGameRoute
          ? 'flex-1 flex flex-col min-h-0 overflow-hidden text-gray-900'
          : 'flex-1 pt-16 md:pt-0 bg-white min-h-screen text-gray-900'
      }
    >
      {isFullscreenRoute && (
        <div className="pointer-events-auto absolute left-2 top-[max(0.5rem,env(safe-area-inset-top))] z-[200] sm:left-3">
          <LanguageSwitcher variant="dark" className="max-w-[130px]" />
        </div>
      )}
      {children}
    </main>
  );
}
