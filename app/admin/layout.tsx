'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CACHE_TTL = 5 * 60 * 1000;
let cache: { admin: boolean; ts: number } | null = null;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm font-bold text-slate-300 animate-pulse">권한 확인 중...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 pt-16 md:pt-0 bg-white min-h-screen text-gray-900">
      {children}
    </main>
  );
}