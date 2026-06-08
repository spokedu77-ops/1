'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DesktopRail, TabBar } from './TabBar';
import { StatusBar } from './StatusBar';
import { TrialCountdownBanner } from '../ui/TrialGateWall';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { isPaidAccessExpired, isTrialExpired } from '../../lib/subscription';
import { useMasterStore, useOperationalStatus, useProfile } from '../../store';

const SPOKEDU_MASTER_FONT = '"SUIT", "Pretendard", "Wanted Sans", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

function FloatingTimerPill() {
  const running = useMasterStore((state) => state.classTimerRunning);
  const ms = useMasterStore((state) => state.classTimerMs);
  const startedAt = useMasterStore((state) => state.classTimerStartedAt);
  const timerReset = useMasterStore((state) => state.classTimerReset);
  const router = useRouter();
  const [displayMs, setDisplayMs] = useState(ms);

  useEffect(() => {
    if (!running) {
      setDisplayMs(ms);
      return;
    }

    const id = setInterval(() => setDisplayMs(ms + (startedAt ? Date.now() - startedAt : 0)), 500);
    return () => clearInterval(id);
  }, [running, ms, startedAt]);

  if (ms === 0 && !running) return null;

  const mins = Math.floor(displayMs / 60000);
  const secs = Math.floor((displayMs % 60000) / 1000);

  return (
    <div className="flex shrink-0 justify-center px-4 pb-2">
      <div
        className="flex items-center gap-3 rounded-full px-4 py-2.5"
        style={{ background: 'rgba(12,12,18,0.96)', border: '1px solid var(--spm-br2)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: running ? 'var(--spm-grn)' : 'var(--spm-amb)' }} />
        <button type="button" onClick={() => router.push('/spokedu-master/class-tools')} className="font-mono text-[15px] font-black tabular-nums" style={{ color: 'var(--spm-t)' }}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </button>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
          {running ? '진행 중' : '일시정지'}
        </span>
        <button
          type="button"
          onClick={() => {
            timerReset();
            setDisplayMs(0);
          }}
          className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-black"
          style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}
          aria-label="타이머 초기화"
        >
          x
        </button>
      </div>
    </div>
  );
}

function OperationsBanner() {
  const profile = useProfile();
  const operational = useOperationalStatus();
  const expired = isTrialExpired(profile);
  const paidExpired = isPaidAccessExpired(profile);
  if (operational.online && !expired) return null;

  if (expired) {
    return (
      <div
        className="mx-[22px] mt-3 flex items-center justify-between gap-3 rounded-[12px] px-3 py-2 sm:mx-8 lg:mx-10"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
        role="status"
      >
        <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>
          {paidExpired ? '이용권이 만료되었습니다.' : '체험 기간이 종료되었습니다.'}
        </p>
        <Link href={paidExpired ? `/spokedu-master/payment?plan=${profile?.previousPaidPlan === 'team' ? 'team' : 'pro'}` : '/spokedu-master/profile?plans=1'} className="flex min-h-9 shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(239,68,68,0.14)', color: 'var(--spm-red)' }}>
          {paidExpired ? '다시 결제하기' : 'Pro 전환'}
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
      오프라인 상태입니다. 이미 불러온 라이브러리와 SPOMOVE 화면은 계속 확인할 수 있습니다.
    </div>
  );
}

export function AppShell({ children, basePath = '/spokedu-master' }: { children: ReactNode; basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const setOnline = useMasterStore((state) => state.setOnline);
  const loadPrograms = useMasterStore((state) => state.loadPrograms);
  const reloadPrograms = useMasterStore((state) => state.reloadPrograms);
  const loadDrills = useMasterStore((state) => state.loadDrills);
  const syncSubscription = useMasterStore((state) => state.syncSubscription);
  const [shellMounted, setShellMounted] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [subscriptionSynced, setSubscriptionSynced] = useState(false);

  const isAdmin = basePath.startsWith('/admin');
  const isSession = pathname.startsWith(`${basePath}/spomove/session`) || pathname.startsWith(`${basePath}/class-mode`);
  const isOnboarding = pathname.startsWith(`${basePath}/onboarding`);
  const isParentView = pathname.startsWith(`${basePath}/parent`);
  const isPayment = pathname.startsWith(`${basePath}/payment`);
  const isLanding = pathname.startsWith(`${basePath}/landing`);
  const isPublicDocument = pathname === `${basePath}/terms` || pathname === `${basePath}/privacy`;
  const isProgramsEditor = pathname.startsWith('/admin/spokedu-master/programs');
  const hideChrome = isOnboarding || isParentView || isPayment || isLanding || isPublicDocument || isProgramsEditor;

  useEffect(() => {
    setShellMounted(true);
    if (isLanding || isPublicDocument) {
      setSubscriptionSynced(true);
      return;
    }
    void loadPrograms();
    void loadDrills();
    void syncSubscription().finally(() => setSubscriptionSynced(true));
  }, [isLanding, isPublicDocument, loadPrograms, loadDrills, syncSubscription]);

  useEffect(() => {
    setStoreHydrated(useMasterStore.persist.hasHydrated());
    const unsubscribe = useMasterStore.persist.onFinishHydration(() => setStoreHydrated(true));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const refreshProgramsOnFocus = () => {
      if (isLanding || isPublicDocument) return;
      if (document.visibilityState !== 'visible') return;
      void reloadPrograms();
    };
    window.addEventListener('focus', refreshProgramsOnFocus);
    document.addEventListener('visibilitychange', refreshProgramsOnFocus);
    return () => {
      window.removeEventListener('focus', refreshProgramsOnFocus);
      document.removeEventListener('visibilitychange', refreshProgramsOnFocus);
    };
  }, [isLanding, isPublicDocument, reloadPrograms]);

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
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations
            .filter((registration) => registration.scope.includes('/spokedu-master/'))
            .forEach((registration) => void registration.unregister());
        })
        .catch(() => undefined);
      return;
    }

    navigator.serviceWorker.register('/spokedu-master-sw.js', { scope: '/spokedu-master/' }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isAdmin || isLanding || isPublicDocument) return;
    if (!storeHydrated || !subscriptionSynced) return;
    if (!isSession && !isOnboarding && !isParentView && !isPayment && profile && !profile.onboardingDone) {
      router.replace(`${basePath}/onboarding`);
    }
  }, [basePath, isAdmin, isLanding, isOnboarding, isParentView, isPayment, isPublicDocument, isSession, profile, router, storeHydrated, subscriptionSynced]);

  if (isSession) {
    return (
      <div className="min-h-dvh bg-black" style={{ fontFamily: SPOKEDU_MASTER_FONT }}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: '#eef2f7', color: '#0f172a' }}>
      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] overflow-hidden border-x"
        style={{
          background: '#f5f7fb',
          borderColor: '#e2e8f0',
          color: '#0f172a',
          fontFamily: SPOKEDU_MASTER_FONT,
        }}
      >
        {hideChrome ? null : <DesktopRail basePath={basePath} />}
        <div className="flex min-w-0 flex-1 flex-col">
          {hideChrome ? null : <StatusBar />}
          <main className="min-h-0 flex-1 overflow-hidden" style={{ background: '#f5f7fb' }}>
            {shellMounted && !hideChrome && !isAdmin ? <OperationsBanner /> : null}
            {shellMounted && !hideChrome && !isAdmin ? <TrialCountdownBanner /> : null}
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          {hideChrome ? null : <FloatingTimerPill />}
          {hideChrome ? null : <TabBar basePath={basePath} />}
        </div>
      </div>
    </div>
  );
}
