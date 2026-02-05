'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getAuthUserOrRedirect } from '@/app/lib/supabase/auth';

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

      const { data: profile } = await getSupabaseBrowserClient()
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // 마스터님 권한(master)도 관리자 페이지에 접근할 수 있도록 조건 수정
      const userRole = profile?.role;
      if (userRole === 'admin' || userRole === 'master') {
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