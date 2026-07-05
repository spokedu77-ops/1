'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TabBar } from './TabBar';
import { StatusBar } from './StatusBar';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { SubscriptionGateWall, type MasterAccessSnapshot } from '../ui/SubscriptionGateWall';
import { ExplanationDataProvider } from '../../explanations/ExplanationDataProvider';
import { OperationalDataProvider } from '../../operational/OperationalDataProvider';
import { useMasterStore, useProfile } from '../../store';
import { getMasterRouteRequirement, getSafeMasterReturnPath, isProtectedMasterRoute, type MasterCapability } from './masterRouteAccess';

const SPOKEDU_MASTER_FONT = '"SUIT", "Pretendard", "Wanted Sans", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
type MasterAccessGuardStatus = 'checking' | 'allowed' | 'redirecting' | 'denied' | 'error';
type MasterAccessGuard = {
  pathname: string;
  status: MasterAccessGuardStatus;
  snapshot: MasterAccessSnapshot | null;
};

function currentLoginRedirectHref() {
  if (typeof window === 'undefined') return '/login';
  const next = getSafeMasterReturnPath(`${window.location.pathname}${window.location.search}`);
  return `/login?next=${encodeURIComponent(next)}`;
}

function hasRouteCapability(snapshot: MasterAccessSnapshot | null, capability: MasterCapability) {
  if (!snapshot) return false;
  if (capability === 'authenticated') return snapshot.authenticated;
  if (capability === 'library') return snapshot.canUseLibrary;
  if (capability === 'classTools') return snapshot.canUseClassTools;
  if (capability === 'records') return snapshot.canUseRecords;
  return snapshot.canUseSpomove;
}

function isLegacyRootServiceWorker(registration: ServiceWorkerRegistration) {
  return [registration.active, registration.waiting, registration.installing].some((worker) => {
    if (!worker?.scriptURL) return false;
    try {
      return new URL(worker.scriptURL).pathname === '/sw.js';
    } catch {
      return false;
    }
  });
}

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
    const id = window.setInterval(() => setDisplayMs(ms + (startedAt ? Date.now() - startedAt : 0)), 500);
    return () => window.clearInterval(id);
  }, [running, ms, startedAt]);

  if (ms === 0 && !running) return null;

  const mins = Math.floor(displayMs / 60000);
  const secs = Math.floor((displayMs % 60000) / 1000);

  return (
    <div className="flex shrink-0 justify-center px-4 pb-2">
      <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-950/95 px-4 py-2.5 shadow-xl">
        <span className={`h-2 w-2 rounded-full ${running ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <button type="button" onClick={() => router.push('/spokedu-master/class-tools')} className="font-mono text-[15px] font-black tabular-nums text-white">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </button>
        <span className="text-[11px] font-semibold text-slate-300">{running ? '진행 중' : '일시정지'}</span>
        <button
          type="button"
          onClick={() => {
            timerReset();
            setDisplayMs(0);
          }}
          className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[11px] font-black text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          aria-label="스탑워치 초기화"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function MasterAccessCheckingState({ error = false, onRetry }: { error?: boolean; onRetry?: () => void }) {
  return (
    <div className="grid min-h-full place-items-center px-6 py-12">
      <div className="w-full max-w-[420px] rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-[13px] font-black text-slate-900">
          {error ? '이용 권한을 확인하지 못했습니다.' : '로그인 상태를 확인하는 중입니다.'}
        </p>
        <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-500">
          {error ? '잠시 후 다시 시도해 주세요.' : 'SPOKEDU MASTER 접근 권한을 확인하고 있습니다.'}
        </p>
        {error ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-4 text-[13px] font-black text-white"
          >
            다시 시도
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MasterAccessDeniedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full overflow-y-auto px-5 py-10 sm:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-[520px] items-center">
        <section className="w-full rounded-[28px] border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600">
            SPOKEDU MASTER
          </p>
          <h1 className="mt-3 text-[28px] font-black leading-tight text-slate-950 sm:text-[34px]">
            SPOKEDU MASTER 이용 권한이 필요합니다.
          </h1>
          <p className="mt-3 text-[14px] font-semibold leading-6 text-slate-500">
            수업 자료, 학생 기록, 저장 안내문을 사용하려면 이용권을 결제해 주세요.
          </p>

          <div className="mt-6 grid gap-2">
            <Link
              href="/spokedu-master/payment"
              className="flex min-h-12 items-center justify-center rounded-[14px] bg-indigo-600 px-4 text-[14px] font-black text-white shadow-lg shadow-indigo-100"
            >
              이용권 선택
            </Link>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onRetry}
              className="flex min-h-11 items-center justify-center rounded-[12px] bg-slate-100 px-3 text-[13px] font-black text-slate-700"
            >
              권한 다시 확인
            </button>
            <Link
              href="/spokedu-master/landing"
              className="flex min-h-11 items-center justify-center rounded-[12px] px-3 text-[13px] font-black text-slate-500"
            >
              소개 페이지로 이동
            </Link>
          </div>
        </section>
      </div>
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
  const syncSubscription = useMasterStore((state) => state.syncSubscription);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [subscriptionSynced, setSubscriptionSynced] = useState(false);
  const [accessGuard, setAccessGuard] = useState<MasterAccessGuard>({
    pathname: '',
    status: 'checking',
    snapshot: null,
  });
  const [accessRetryKey, setAccessRetryKey] = useState(0);

  const isAdmin = basePath.startsWith('/admin');
  const isSession = pathname.startsWith(`${basePath}/spomove/session`);
  const isOnboarding = pathname.startsWith(`${basePath}/onboarding`);
  const isParentView = pathname.startsWith(`${basePath}/parent`);
  const isPayment = pathname.startsWith(`${basePath}/payment`);
  const isLanding = pathname.startsWith(`${basePath}/landing`);
  const isLibraryDetail = pathname.startsWith(`${basePath}/library/`);
  const isPublicDocument = pathname === `${basePath}/terms` || pathname === `${basePath}/privacy`;
  const isProgramsEditor = pathname.startsWith('/admin/spokedu-master/programs');
  const hideChrome = isOnboarding || isParentView || isPayment || isLanding || isPublicDocument || isProgramsEditor;
  const isProtectedRoute = isProtectedMasterRoute(pathname, basePath);
  const routeRequirement = getMasterRouteRequirement(pathname, basePath);
  const isAccessGuardPending =
    isProtectedRoute &&
    (!subscriptionSynced ||
      accessGuard.pathname !== pathname ||
      accessGuard.status === 'checking' ||
      accessGuard.status === 'redirecting');
  const isAccessGuardError =
    isProtectedRoute && accessGuard.pathname === pathname && accessGuard.status === 'error';
  const isAccessGuardDenied =
    isProtectedRoute && accessGuard.pathname === pathname && accessGuard.status === 'denied';
  const routeGateDenied =
    isProtectedRoute &&
    accessGuard.pathname === pathname &&
    accessGuard.status === 'allowed' &&
    !hasRouteCapability(accessGuard.snapshot, routeRequirement.capability);
  useEffect(() => {
    if (isLanding || isPublicDocument) {
      setSubscriptionSynced(true);
      return;
    }
    void syncSubscription().then(setSubscriptionSynced);
  }, [isLanding, isPublicDocument, syncSubscription]);

  useEffect(() => {
    if (isLanding || isPublicDocument) return;
    if (isProtectedRoute && accessGuard.status !== 'allowed') return;
    void loadPrograms();
  }, [accessGuard.status, isLanding, isProtectedRoute, isPublicDocument, loadPrograms]);

  useEffect(() => {
    setStoreHydrated(useMasterStore.persist.hasHydrated());
    const unsubscribe = useMasterStore.persist.onFinishHydration(() => setStoreHydrated(true));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const refreshProgramsOnFocus = () => {
      if (isLanding || isPublicDocument || document.visibilityState !== 'visible') return;
      if (isProtectedRoute && accessGuard.status !== 'allowed') return;
      void reloadPrograms();
    };
    window.addEventListener('focus', refreshProgramsOnFocus);
    document.addEventListener('visibilitychange', refreshProgramsOnFocus);
    return () => {
      window.removeEventListener('focus', refreshProgramsOnFocus);
      document.removeEventListener('visibilitychange', refreshProgramsOnFocus);
    };
  }, [accessGuard.status, isLanding, isProtectedRoute, isPublicDocument, reloadPrograms]);

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
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations
            .filter(isLegacyRootServiceWorker)
            .map((registration) => registration.unregister()),
        ),
      )
      .catch(() => undefined)
      .finally(() => {
        void navigator.serviceWorker.register('/spokedu-master-sw.js', { scope: '/spokedu-master/' }).catch(() => undefined);
      });
  }, []);

  useEffect(() => {
    if (isAdmin || isLanding || isPublicDocument || !storeHydrated || !subscriptionSynced) return;
    if (isProtectedRoute && accessGuard.status !== 'allowed') return;
    if (!isSession && !isOnboarding && !isParentView && !isPayment && profile && !profile.onboardingDone) {
      router.replace(`${basePath}/onboarding`);
    }
  }, [accessGuard.status, basePath, isAdmin, isLanding, isOnboarding, isParentView, isPayment, isProtectedRoute, isPublicDocument, isSession, profile, router, storeHydrated, subscriptionSynced]);

  useEffect(() => {
    if (!isProtectedRoute) {
      setAccessGuard({ pathname, status: 'allowed', snapshot: null });
      return;
    }

    let cancelled = false;
    setAccessGuard({ pathname, status: 'checking', snapshot: null });

    fetch('/api/spokedu-master/access', {
      cache: 'no-store',
      credentials: 'include',
    })
      .then(async (response) => {
        if (cancelled) return;

        if (response.ok) {
          const snapshot = await response.json() as MasterAccessSnapshot;
          setAccessGuard({ pathname, status: 'allowed', snapshot });
          return;
        }

        if (response.status === 401) {
          setAccessGuard({ pathname, status: 'redirecting', snapshot: null });
          router.replace(currentLoginRedirectHref());
          return;
        }

        if (response.status === 403) {
          setAccessGuard({ pathname, status: 'denied', snapshot: null });
          return;
        }

        setAccessGuard({ pathname, status: 'error', snapshot: null });
      })
      .catch(() => {
        if (!cancelled) {
          setAccessGuard({ pathname, status: 'error', snapshot: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessRetryKey, isProtectedRoute, pathname, router]);

  if (isSession) {
    return (
      <div className="min-h-dvh bg-black text-white" style={{ fontFamily: SPOKEDU_MASTER_FONT }}>
        {isAccessGuardPending ? (
          <MasterAccessCheckingState />
        ) : routeGateDenied && routeRequirement.capability !== 'authenticated' && accessGuard.snapshot ? (
          <SubscriptionGateWall requirement={routeRequirement.capability} snapshot={accessGuard.snapshot} />
        ) : isAccessGuardDenied ? (
          <MasterAccessDeniedState onRetry={() => setAccessRetryKey((key) => key + 1)} />
        ) : isAccessGuardError ? (
          <MasterAccessCheckingState error onRetry={() => setAccessRetryKey((key) => key + 1)} />
        ) : (
          children
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#eef2f7] text-slate-900">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] overflow-hidden border-x border-slate-200 bg-[#f5f7fb]" style={{ fontFamily: SPOKEDU_MASTER_FONT }}>
        <div className="flex min-w-0 flex-1 flex-col">
          {hideChrome ? null : (
            <div className={isLibraryDetail ? 'hidden lg:block' : undefined}>
              <StatusBar />
            </div>
          )}
          <main className="min-h-0 flex-1 overflow-hidden bg-[#f5f7fb]">
            {isAccessGuardPending ? (
              <MasterAccessCheckingState />
            ) : routeGateDenied && routeRequirement.capability !== 'authenticated' && accessGuard.snapshot ? (
              <SubscriptionGateWall requirement={routeRequirement.capability} snapshot={accessGuard.snapshot} />
            ) : isAccessGuardDenied ? (
              <MasterAccessDeniedState onRetry={() => setAccessRetryKey((key) => key + 1)} />
            ) : isAccessGuardError ? (
              <MasterAccessCheckingState error onRetry={() => setAccessRetryKey((key) => key + 1)} />
            ) : (
              <ErrorBoundary>
                <OperationalDataProvider>
                  <ExplanationDataProvider>{children}</ExplanationDataProvider>
                </OperationalDataProvider>
              </ErrorBoundary>
            )}
          </main>
          {hideChrome ? null : <FloatingTimerPill />}
          {hideChrome ? null : <TabBar basePath={basePath} />}
        </div>
      </div>
    </div>
  );
}
