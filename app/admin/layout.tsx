'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

      if (profile?.role !== 'admin') {
        alert('관리자 권한이 없습니다.');
        router.push('/teacher/my-classes');
      } else {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, [router]);

  // 권한 체크 중일 때도 배경색은 흰색으로 유지되도록 함
  if (!isAdmin) return <div className="min-h-screen bg-white"></div>;

  return (
    // bg-white와 min-h-screen을 추가하여 다크 모드 침범을 막음
    <main className="flex-1 pt-16 md:pt-0 bg-white min-h-screen text-gray-900">
      {children}
    </main>
  );
}