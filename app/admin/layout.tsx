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

  if (!isAdmin) return null;

  // 핵심 수정: main 태그로 감싸고 상단 여백(pt-16)을 추가함
  return (
    <main className="flex-1 pt-16 md:pt-0">
      {children}
    </main>
  );
}