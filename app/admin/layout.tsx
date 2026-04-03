'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const CACHE_TTL = 5 * 60 * 1000;
const SLOW_CHECK_MS = 3000;
let cache: { admin: boolean; ts: number } | null = null;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      if (cache && now - cache.ts < CACHE_TTL) {
        if (cache.admin) setIsAdmin(true);
        else router.replace('/teacher/my-classes');
        return;
      }

      let res: Response, json: {admin?: boolean; reason?: string};
      try {
        res = await fetch('/api/auth/check-admin', { credentials: 'include' });
        json = await res.json();
      } catch {
        router.replace('/login');
        return;
      }

      cache = { admin: !!json.admin, ts: Date.now() };

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
          ? 'flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-[#0F172A] text-gray-900'
          : isGameRoute
          ? 'flex-1 min-h-screen text-gray-900'
          : 'flex-1 pt-16 md:pt-0 bg-white min-h-screen text-gray-900'
      }
    >
      {children}
    </main>
  );
}