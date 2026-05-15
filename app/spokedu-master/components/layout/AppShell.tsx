'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DesktopRail, TabBar } from './TabBar';
import { StatusBar } from './StatusBar';
import { TrialCountdownBanner } from '../ui/TrialGateWall';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { isTrialExpired } from '../../lib/subscription';
import { useMasterStore, useOperationalStatus, useProfile } from '../../store';

function OperationsBanner() {
  const profile = useProfile();
  const operational = useOperationalStatus();
  const expired = isTrialExpired(profile);
  if (operational.online && !expired) return null;

  if (expired) {
    return (
      <div
        className="mx-[22px] mt-3 flex items-center justify-between gap-3 rounded-[12px] px-3 py-2 sm:mx-8 lg:mx-10"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
        role="status"
      >
        <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>무료 체험이 종료되었습니다.</p>
        <Link href="/spokedu-master/payment?plan=pro" className="shrink-0 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(239,68,68,0.14)', color: 'var(--spm-red)' }}>
          Pro 시작
        </Link>
      </div>
    );
  }

  return (
    <div
      className="mx-[22px] mt-3 rounded-[12px] px-3 py-2 text-[12px] font-bold sm:mx-8 lg:mx-10"
      style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)', border: '1px solid rgba(245,158,11,0.25)' }}
      role="status"
    >
      오프라인 상태입니다. 라이브러리와 SPOMOVE 화면은 계속 확인할 수 있습니다.
    </div>
  );
}

export function AppShell({ children, basePath = '/spokedu-master' }: { children: ReactNode; basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const setOnline = useMasterStore((state) => state.setOnline);
  const isSession = pathname.startsWith(`${basePath}/spomove/session`);
  const isOnboarding = pathname.startsWith(`${basePath}/onboarding`);
  const isParentView = pathname.startsWith(`${basePath}/parent`);
  const isPayment = pathname.startsWith(`${basePath}/payment`);

  const loadPrograms = useMasterStore((state) => state.loadPrograms);
  const loadDrills = useMasterStore((state) => state.loadDrills);
  const syncSubscription = useMasterStore((state) => state.syncSubscription);

  useEffect(() => {
    void loadPrograms();
    void loadDrills();
    void syncSubscription();
  }, [loadPrograms, loadDrills, syncSubscription]);

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
    if (!isSession && !isOnboarding && !isParentView && !isPayment && profile && !profile.onboardingDone) {
      router.replace(`${basePath}/onboarding`);
    }
  }, [basePath, isOnboarding, isParentView, isPayment, isSession, profile, router]);

  if (isSession) {
    return <div className="min-h-dvh bg-black" style={{ fontFamily: 'var(--spm-font-body)' }}>{children}</div>;
  }

  const hideChrome = isOnboarding || isParentView || isPayment;

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(135deg, #07070c 0%, #101426 55%, #07070c 100%)', color: 'var(--spm-t)' }}>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] overflow-hidden border-x border-white/5" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
        {hideChrome ? null : <DesktopRail basePath={basePath} />}
        <div className="flex min-w-0 flex-1 flex-col">
          {hideChrome ? null : <StatusBar />}
          <main className="min-h-0 flex-1 overflow-hidden" style={{ background: 'var(--spm-bg)' }}>
            {hideChrome ? null : <OperationsBanner />}
            {hideChrome ? null : <TrialCountdownBanner />}
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
          {hideChrome ? null : <TabBar basePath={basePath} />}
        </div>
      </div>
    </div>
  );
}
