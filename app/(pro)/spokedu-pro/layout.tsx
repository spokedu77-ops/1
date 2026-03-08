'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

/**
 * 스포키듀 구독(히든카드) 전용 레이아웃.
 * D2: /login 리다이렉트는 이 layout에서만 처리. (다른 곳에서 redirect 금지.)
 * - 접근 제어: 로그인 필수. 미인증 시 /login 리다이렉트.
 * - 전체 화면 사용 (사이드바는 root에서 fullscreen 경로로 미렌더).
 * - 높이: window.innerHeight(px)로 설정해 100vh/100dvh 차이로 인한 하단 여백 제거.
 */
export default function SpokeduProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    const check = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
    };
    check();
  }, [router]);

  return (
    <div
      className="w-full overflow-hidden bg-[#0F172A] flex flex-col"
      style={{ minHeight: 'var(--viewport-height-px, 100vh)', height: 'var(--viewport-height-px, 100vh)' }}
    >
      {children}
    </div>
  );
}
