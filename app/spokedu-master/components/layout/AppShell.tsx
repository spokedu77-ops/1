'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DesktopRail, TabBar } from './TabBar';
import { StatusBar } from './StatusBar';
import { isTrialExpired } from '../../lib/subscription';
import { useMasterStore, useOperationalStatus, useProfile } from '../../store';

function OperationsBanner() {
  const profile = useProfile();
  const operational = useOperationalStatus();
  const expired = isTrialExpired(profile);
  if (operational.online && !expired) return null;

  const label = !operational.online
    ? '오프라인 상태입니다. 라이브러리와 SPOMOVE 화면은 계속 확인할 수 있습니다.'
    : expired
      ? '무료 체험이 종료되었습니다. 내 정보에서 이어서 사용할 플랜을 확인하세요.'
      : '';

  return (
    <div
      className="mx-[22px] mt-3 rounded-[12px] px-3 py-2 text-[12px] font-bold sm:mx-8 lg:mx-10"
      style={{
        background: expired ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
        color: expired ? 'var(--spm-red)' : 'var(--spm-amb)',
        border: expired ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(245,158,11,0.25)',
      }}
      role="status"
    >
      {label}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const setOnline = useMasterStore((state) => state.setOnline);
  const isSession = pathname.startsWith('/spokedu-master/spomove/session');
  const isOnboarding = pathname.startsWith('/spokedu-master/onboarding');
  const isParentView = pathname.startsWith('/spokedu-master/parent');

  useEffect(() => {
    const updateOnline = () => setOnline(window.navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, [setOnline]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/spokedu-master-sw.js', { scope: '/spokedu-master/' }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!isSession && !isOnboarding && !isParentView && profile && !profile.onboardingDone) {
      router.replace('/spokedu-master/onboarding');
    }
  }, [isOnboarding, isParentView, isSession, profile, router]);

  if (isSession) {
    return <div className="min-h-dvh bg-black" style={{ fontFamily: 'var(--spm-font-body)' }}>{children}</div>;
  }

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(135deg, #07070c 0%, #101426 55%, #07070c 100%)', color: 'var(--spm-t)' }}>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] overflow-hidden border-x border-white/5" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
        {isOnboarding || isParentView ? null : <DesktopRail />}
        <div className="flex min-w-0 flex-1 flex-col">
          {isOnboarding || isParentView ? null : <StatusBar />}
          <main className="min-h-0 flex-1 overflow-hidden" style={{ background: 'var(--spm-bg)' }}>
            {isOnboarding || isParentView ? null : <OperationsBanner />}
            {children}
          </main>
          {isOnboarding || isParentView ? null : <TabBar />}
        </div>
      </div>
    </div>
  );
}
