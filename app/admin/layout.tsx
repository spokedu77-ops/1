'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getAuthUserOrRedirect } from '@/app/lib/supabase/auth';

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5분
let authCache: { isAdmin: boolean; userId: string; ts: number } | null = null;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = getSupabaseBrowserClient();
      const user = await getAuthUserOrRedirect(supabase);
      if (!user) {
        router.push('/login');
        return;
      }

      const now = Date.now();
      if (authCache && authCache.userId === user.id && now - authCache.ts < AUTH_CACHE_TTL_MS) {
        setIsAdmin(authCache.isAdmin);
        if (!authCache.isAdmin) router.push('/teacher/my-classes');
        return;
      }

      const { data: profile, error: profileError } = await getSupabaseBrowserClient()
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        alert('권한 확인 중 오류가 발생했습니다. 다시 시도해 주세요.');
        router.push('/login');
        return;
      }

      const userRole = profile?.role;
      const admin = userRole === 'admin' || userRole === 'master';
      authCache = { isAdmin: admin, userId: user.id, ts: now };

      if (admin) {
        setIsAdmin(true);
      } else {
        alert('관리자 권한이 없습니다.');
        router.push('/teacher/my-classes');
      }
    };
    checkAdmin();
  }, [router]);

  // 권한 체크 중일 때 로딩 표시
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