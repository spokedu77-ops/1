'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Vercel 검수 시 환경변수 에러 방지 처리
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
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

  // 권한 체크 중일 때도 배경색은 흰색으로 유지
  if (!isAdmin) return <div className="min-h-screen bg-white"></div>;

  return (
    <main className="flex-1 pt-16 md:pt-0 bg-white min-h-screen text-gray-900">
      {children}
    </main>
  );
}