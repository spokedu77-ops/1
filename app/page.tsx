'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      // 1. 로그인 세션 확인
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // 로그인 안 되어 있으면 로그인 페이지로
        router.push('/login');
        return;
      }

      // 2. 로그인 되어 있으면 역할 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/teacher/my-classes');
      }
    };

    checkUser();
  }, [router]);

  // 로딩 중임을 표시 (잠깐 지나가는 화면)
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse flex flex-col items-center">
        <h1 className="text-2xl font-black italic text-blue-900 uppercase">Spokedu</h1>
        <p className="text-xs text-gray-400 mt-2 font-mono uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}