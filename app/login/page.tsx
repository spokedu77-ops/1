'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, ChevronLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { isRefreshTokenError } from '@/app/lib/supabase/auth';
import { parseSafeNextRedirect } from '@/app/lib/auth/safeNextRedirect';
import { resolvePostLoginRedirect } from '@/app/lib/auth/postLoginRedirect';
import { resolveLoginEmail } from '@/app/lib/auth/loginEmail';
import {
  applyLoginSessionPreference,
  enforceSessionOnlyPolicy,
  readKeepLoggedInPreference,
} from '@/app/lib/auth/sessionPersistence';
import { rememberLastUsedAppFromPath } from '@/app/lib/auth/lastUsedApp';
import { reportLoginUxEvent } from '@/app/lib/auth/loginUxTelemetry';
import { MasterEmailOtpForm } from '@/app/components/auth/MasterEmailOtpForm';
import { useMasterEmailOtp } from '@/app/components/auth/useMasterEmailOtp';

type LoginTab = 'master' | 'ops';

function isMasterNextPath(nextSafe: string | null): boolean {
  return (
    nextSafe === '/spokedu-master/onboarding' ||
    nextSafe === '/spokedu-master/profile' ||
    nextSafe === '/spokedu-master/dashboard' ||
    (nextSafe != null && nextSafe.startsWith('/spokedu-master/'))
  );
}

function LoginContent() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LoginTab>('ops');
  const otp = useMasterEmailOtp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get('type') || 'teacher';
  const nextSafe = parseSafeNextRedirect(searchParams.get('next'));
  const prefersMasterTab =
    type !== 'admin' && (searchParams.get('mode') === 'trial' || isMasterNextPath(nextSafe));

  useEffect(() => {
    setKeepLoggedIn(readKeepLoggedInPreference());
  }, []);

  useEffect(() => {
    setActiveTab(prefersMasterTab ? 'master' : 'ops');
  }, [prefersMasterTab]);

  useEffect(() => {
    let cancelled = false;

    const checkInitialSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await enforceSessionOnlyPolicy(() => supabase.auth.signOut());

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000),
        );
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise,
        ]);
        const { data: { session }, error: sessionError } = sessionResult;

        if (sessionError && isRefreshTokenError(sessionError)) {
          await supabase.auth.signOut();
          if (!cancelled) setSessionChecked(true);
          return;
        }

        if (session?.user) {
          const redirectPath = await resolvePostLoginRedirect(nextSafe, supabase, session.user);
          reportLoginUxEvent('auto_redirect_from_login', {
            redirectPath,
            activeTab: prefersMasterTab ? 'master' : 'ops',
          });
          if (!cancelled) {
            router.replace(redirectPath);
          }
          return;
        }
      } catch {
        // 타임아웃 또는 에러 시 로그인 폼 표시
      }

      if (!cancelled) setSessionChecked(true);
    };

    void checkInitialSession();
    return () => {
      cancelled = true;
    };
  }, [nextSafe, router]);

  const finishLogin = async (
    supabase: ReturnType<typeof getSupabaseBrowserClient>,
    loggedInUser: { id: string; email?: string | null },
  ) => {
    applyLoginSessionPreference(keepLoggedIn);

    const redirectPath = await resolvePostLoginRedirect(nextSafe, supabase, loggedInUser);

    if (type === 'admin' && !nextSafe && redirectPath !== '/admin') {
      setLoginError('관리자 권한이 없는 계정입니다. 등록된 관리자 계정으로 로그인해 주세요.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    rememberLastUsedAppFromPath(redirectPath);
    router.push(redirectPath);
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    otp.setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const loginEmail = resolveLoginEmail(id);
      const rawPw = pw.replace(/-/g, '');

      const timeout = (ms: number) =>
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), ms),
        );

      let signInResult = await Promise.race([
        supabase.auth.signInWithPassword({ email: loginEmail, password: pw }),
        timeout(90000),
      ]);
      let { data, error } = signInResult;

      if (error) {
        const retry = await Promise.race([
          supabase.auth.signInWithPassword({ email: loginEmail, password: rawPw }),
          timeout(90000),
        ]);
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        setLoginError('로그인 정보를 다시 확인해 주세요.');
        setIsLoading(false);
        return;
      }

      const loggedInUser = data?.user;
      if (loggedInUser) {
        await finishLogin(supabase, loggedInUser);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error && err.message === 'TIMEOUT'
        ? '서버 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
        : '로그인 중 오류가 발생했습니다.';
      setLoginError(msg);
      setIsLoading(false);
    }
  };

  const handleMasterOtpSubmit = async () => {
    setLoginError(null);
    const result = await otp.submit();
    if (!result.ok || result.kind === 'sent') return;
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    try {
      await finishLogin(supabase, result.user);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTab = (tab: LoginTab) => {
    setActiveTab(tab);
    setLoginError(null);
    otp.setError(null);
    reportLoginUxEvent('login_tab_selected', { activeTab: tab });
  };

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220]">
        <div className="animate-pulse text-sm font-black uppercase tracking-[0.28em] text-slate-500">SPOKEDU</div>
      </div>
    );
  }

  const displayError = loginError ?? otp.error;
  const showMasterTab = activeTab === 'master';
  const brandEyebrow = showMasterTab
    ? 'SPOKEDU MASTER'
    : type === 'admin'
      ? 'System Administrator'
      : 'Physical Education Expert';
  const brandHeadline = showMasterTab
    ? '수업 준비부터 안내문까지, 한 흐름으로.'
    : type === 'admin'
      ? '운영 콘솔에 안전하게 접속합니다.'
      : '강사·운영 계정으로 업무를 이어가세요.';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 12% 18%, rgba(37,99,235,0.28), transparent 55%), radial-gradient(ellipse 60% 45% at 88% 12%, rgba(14,165,233,0.14), transparent 50%), radial-gradient(ellipse 70% 50% at 70% 90%, rgba(30,58,138,0.35), transparent 55%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
        }}
      />

      <Link
        href="/"
        className="absolute left-4 top-4 z-20 inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-300 backdrop-blur-md transition hover:border-white/20 hover:bg-white/10 hover:text-white sm:left-8 sm:top-8"
      >
        <ChevronLeft size={18} />
        <span>메인으로</span>
      </Link>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-16 sm:px-6 lg:px-10 lg:py-12">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <aside className="relative hidden flex-col justify-between border-b border-white/10 p-8 sm:p-10 lg:flex lg:border-b-0 lg:border-r lg:p-12">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-300/90">{brandEyebrow}</p>
              <h1 className="mt-5 text-[42px] font-black italic leading-none tracking-tight text-white">
                SPOKEDU
              </h1>
              <div className="mt-5 h-1 w-14 rounded-full bg-sky-400" />
              <p className="mt-8 max-w-sm text-[22px] font-semibold leading-snug tracking-tight text-slate-100">
                {brandHeadline}
              </p>
              <p className="mt-4 max-w-sm text-[14px] font-medium leading-6 text-slate-400">
                {showMasterTab
                  ? '이메일 인증으로 바로 시작하거나, 기존 계정은 비밀번호로 이어서 로그인하세요.'
                  : '강사 앱·관리자 콘솔 계정은 이쪽에서 로그인합니다.'}
              </p>
            </div>
            <div className="mt-12 space-y-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <p>Play · Think · Flow</p>
              <p className="tracking-[0.12em] normal-case text-slate-600">Yonsei PE Specialists</p>
            </div>
          </aside>

          <form
            onSubmit={handleLogin}
            className="flex flex-col justify-center bg-[#f7f8fb] p-6 text-slate-900 sm:p-9 lg:p-11"
          >
            <div className="lg:hidden">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">{brandEyebrow}</p>
              <h1 className="mt-3 text-[32px] font-black italic leading-none tracking-tight text-slate-900">
                SPOKEDU
              </h1>
              <p className="mt-3 text-[15px] font-semibold leading-6 text-slate-600">{brandHeadline}</p>
            </div>

            <div className="mt-6 lg:mt-0">
              <p className="hidden text-[13px] font-bold text-slate-500 lg:block">로그인 방식</p>
              <div
                className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/80 p-1"
                role="tablist"
                aria-label="로그인 방식"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={showMasterTab}
                  onClick={() => selectTab('master')}
                  className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${
                    showMasterTab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  MASTER
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!showMasterTab}
                  onClick={() => selectTab('ops')}
                  className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${
                    !showMasterTab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  강사·관리자
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {showMasterTab ? (
                <MasterEmailOtpForm
                  email={otp.email}
                  otp={otp.otp}
                  otpSent={otp.otpSent}
                  loading={otp.loading || isLoading}
                  message={otp.message}
                  onEmailChange={otp.setEmail}
                  onOtpChange={otp.setOtp}
                  onSubmit={() => void handleMasterOtpSubmit()}
                  footer={
                    <button
                      type="button"
                      onClick={() => selectTab('ops')}
                      className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      비밀번호로 로그인
                      <ArrowRight size={16} />
                    </button>
                  }
                />
              ) : (
                <>
                  {type === 'admin' && (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium leading-relaxed text-slate-500">
                      관리자 ID는 <span className="font-bold text-slate-700">choijihoon</span>,{' '}
                      <span className="font-bold text-slate-700">kimkoomin</span>,{' '}
                      <span className="font-bold text-slate-700">kimyoonki</span> 또는 해당 @spokedu.com 이메일입니다.
                      <span className="mt-1 block text-slate-400">admin 입력 시 최지훈(choijihoon) 계정으로 연결됩니다.</span>
                    </p>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 ml-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        ID / NAME
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="아이디를 입력하세요"
                          value={id}
                          onChange={(e) => setId(e.target.value)}
                          required={!showMasterTab}
                          className="w-full min-h-12 rounded-2xl border border-slate-200 bg-white p-4 pl-12 text-base font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 ml-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        PASSWORD
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="password"
                          placeholder="비밀번호를 입력하세요"
                          value={pw}
                          onChange={(e) => setPw(e.target.value)}
                          required={!showMasterTab}
                          className="w-full min-h-12 rounded-2xl border border-slate-200 bg-white p-4 pl-12 text-base font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black tracking-wide text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {isLoading ? '연결 중... (최초 접속 시 1분 소요)' : '로그인'}
                  </button>

                  {prefersMasterTab && (
                    <button
                      type="button"
                      onClick={() => selectTab('master')}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      이메일 인증으로 시작하기
                      <ArrowRight size={16} />
                    </button>
                  )}
                </>
              )}

              <label className="flex cursor-pointer items-center gap-3 px-0.5">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-600">이 기기에서 로그인 유지</span>
              </label>

              {displayError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-bold text-red-600">
                  {displayError}
                </p>
              )}
            </div>

            <div className="mt-8 space-y-1 text-center lg:hidden">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Play · Think · Flow with Spokedu
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-300">
                Yonsei University Physical Education Specialists
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b1220]" />}>
      <LoginContent />
    </Suspense>
  );
}
