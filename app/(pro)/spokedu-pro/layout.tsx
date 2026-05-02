'use client';

import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
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
      className="relative w-full max-w-full min-w-0 overflow-hidden bg-[#0F172A] flex flex-col flex-1"
      style={{ minHeight: 'var(--viewport-height-px, 100vh)', height: 'var(--viewport-height-px, 100vh)' }}
    >
      {/* 데스크톱: 우상단. 모바일: 하단 탭 위 플로팅 pill (콘텐츠·툴킷과 겹침 최소화) */}
      <div className="spokedu-pro-lang-switcher pointer-events-auto fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[195] md:absolute md:right-3 md:top-[max(0.5rem,env(safe-area-inset-top))] md:bottom-auto md:left-auto">
        <LanguageSwitcher
          variant="dark"
          className="max-w-[118px] md:max-w-[130px] rounded-full border-cyan-500/15 bg-slate-950/88 px-2.5 py-1 text-[11px] shadow-lg shadow-cyan-950/20 ring-1 ring-fuchsia-500/10 backdrop-blur-md md:rounded-lg md:px-2 md:py-1.5 md:shadow-md"
        />
      </div>
      {children}
    </div>
  );
}
