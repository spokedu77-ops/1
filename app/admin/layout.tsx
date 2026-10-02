'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  clearAdminCheckCache,
  readAdminCheckMemoryCache,
  readAdminCheckStorageCache,
  writeAdminCheckCache,
} from '@/app/lib/auth/adminCheckCache';

const SLOW_CHECK_MS = 3000;

type AdminCheckResponse = {
  admin?: boolean;
  reason?: 'no-session' | 'forbidden' | 'server-error';
  scope?: 'admin' | 'spomove';
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [scopeChecked, setScopeChecked] = useState(false);
  const [checkSlow, setCheckSlow] = useState(false);
  const isNoteRoute = pathname != null && pathname.startsWith('/admin/note');
  const isFullscreenRoute =
    pathname != null && (pathname === '/admin/spokedu-master' || pathname.startsWith('/admin/spokedu-master/'));
  // 실제 존재하는 플레이어 라우트만 유지해 유령 prefix 재유입을 막습니다.
  const GAME_ROUTE_PREFIXES = ['/admin/camera', '/admin/spomove/training/_player'] as const;
  const isGameRoute =
    pathname != null &&
    GAME_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    const slowTimer = setTimeout(() => setCheckSlow(true), SLOW_CHECK_MS);
    return () => clearTimeout(slowTimer);
  }, []);

  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      const mem = readAdminCheckMemoryCache(now);
      if (mem) {
        if (mem.scope === 'spomove' && pathname !== '/admin/spomove/training') {
          router.replace('/admin/spomove/training');
          return;
        }
        setIsAdmin(true);
        setScopeChecked(true);
        return;
      }
      const stored = readAdminCheckStorageCache(now);
      if (stored) {
        if (stored.scope === 'spomove' && pathname !== '/admin/spomove/training') {
          router.replace('/admin/spomove/training');
          return;
        }
        setIsAdmin(true);
        setScopeChecked(true);
        return;
      }

      let res: Response;
      let json: AdminCheckResponse;
      try {
        res = await fetch('/api/auth/check-admin', { credentials: 'include' });
        json = (await res.json()) as AdminCheckResponse;
      } catch {
        router.replace('/login');
        return;
      }

      if (json.reason === 'server-error') {
        setCheckSlow(true);
        return;
      }

      if (json.admin) {
        if (json.scope === 'spomove' && pathname !== '/admin/spomove/training') {
          router.replace('/admin/spomove/training');
          return;
        }
        writeAdminCheckCache({ admin: true, ts: Date.now(), scope: json.scope ?? 'admin' });
        setIsAdmin(true);
        setScopeChecked(true);
        return;
      }

      clearAdminCheckCache();

      if (json.reason === 'no-session') {
        router.replace('/login');
      } else {
        router.replace('/teacher/my-classes');
      }
    };

    void check();
  }, [pathname, router]);

  if (!isAdmin || !scopeChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white">
        <p className="animate-pulse text-sm font-bold text-slate-300">권한 확인 중...</p>
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
            : isNoteRoute
              ? 'flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-white text-gray-900'
              : 'flex-1 min-h-screen min-w-0 w-full bg-white text-gray-900'
      }
    >
      {children}
    </main>
  );
}
