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
const CHECK_TIMEOUT_MS = 10000;

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
  const [checkFailed, setCheckFailed] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const isNoteRoute = pathname != null && pathname.startsWith('/admin/note');
  const isReportRoute = pathname != null && pathname.startsWith('/admin/master/reports');
  const isFullscreenRoute =
    pathname != null && (
      pathname === '/admin/spokedu-master'
      || pathname.startsWith('/admin/spokedu-master/')
      || pathname === '/admin/spokedu-lab'
      || pathname.startsWith('/admin/spokedu-lab/')
    );
  // 실제 존재하는 플레이어 라우트만 유지해 유령 prefix 재유입을 막습니다.
  const GAME_ROUTE_PREFIXES = ['/admin/spomove/training/_player'] as const;
  const isGameRoute =
    pathname != null &&
    GAME_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    const slowTimer = setTimeout(() => setCheckSlow(true), SLOW_CHECK_MS);
    return () => clearTimeout(slowTimer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
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
        requestTimer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
        res = await fetch('/api/auth/check-admin', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Admin check failed');
        json = (await res.json()) as AdminCheckResponse;
        if (!json || typeof json.admin !== 'boolean') throw new Error('Invalid admin check response');
      } catch {
        if (!cancelled) setCheckFailed(true);
        return;
      } finally {
        clearTimeout(requestTimer);
      }
      if (cancelled) return;

      if (json.reason === 'server-error') {
        setCheckFailed(true);
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
        router.replace(`/login?type=admin&reauth=1&next=${encodeURIComponent(pathname || '/admin')}`);
      } else {
        router.replace('/teacher/my-classes');
      }
    };

    void check();
    return () => {
      cancelled = true;
      clearTimeout(requestTimer);
      controller.abort();
    };
  }, [pathname, router, checkAttempt]);

  if (!isAdmin || !scopeChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white">
        <p role={checkFailed ? 'alert' : 'status'} className={`text-sm font-bold ${checkFailed ? 'text-slate-600' : 'animate-pulse text-slate-300'}`}>
          {checkFailed ? '접근 권한을 확인하지 못했습니다.' : '권한 확인 중...'}
        </p>
        {checkFailed ? (
          <>
            <p className="text-xs text-slate-500">연결 상태를 확인한 뒤 다시 시도해 주세요.</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              onClick={() => {
                setCheckFailed(false);
                setCheckSlow(false);
                setCheckAttempt((attempt) => attempt + 1);
              }}
            >다시 확인하기</button>
            <a className="mt-2 text-sm text-slate-600 underline" href={`/login?type=admin&reauth=1&next=${encodeURIComponent(pathname || '/admin')}`}>다시 로그인하기</a>
          </>
        ) : checkSlow && (
          <p className="text-xs text-slate-400">잠시 후 다시 시도해 주세요. 로그인 상태를 확인해 주세요.</p>
        )}
      </div>
    );
  }

  return (
    <main
      className={
        isReportRoute
          ? 'flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden bg-[#f7f8f5] text-gray-900'
          : isFullscreenRoute
          ? 'flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-[#0F172A] text-gray-900 relative'
          : isGameRoute
            ? 'flex-1 flex flex-col min-h-0 overflow-hidden text-gray-900'
            : isNoteRoute
              ? 'flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-white text-gray-900'
              : pathname === '/admin' || pathname === '/admin/teachers-classes' || pathname === '/admin/users' || pathname === '/admin/classes/calendar' || pathname === '/admin/inventory'
                ? 'flex-1 min-h-0 min-w-0 w-full bg-white text-gray-900'
                : 'flex-1 min-h-screen min-w-0 w-full bg-white text-gray-900'
      }
    >
      {children}
    </main>
  );
}
