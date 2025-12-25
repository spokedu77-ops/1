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

  // 권한 확인 전에는 아무것도 렌더링하지 않음
  if (!isAdmin) return null;

  // 관리자라면 내용물만 보여줌 (사이드바는 RootLayout에서 그려줌)
  return <>{children}</>;
}