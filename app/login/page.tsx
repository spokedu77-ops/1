'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, ChevronLeft } from 'lucide-react';
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

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse text-sm font-black uppercase tracking-widest text-slate-300">SPOKEDU</div>
      </div>
    );
  }

  const displayError = loginError ?? otp.error;
  const showMasterTab = activeTab === 'master';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)] relative">
      <Link href="/" className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold text-sm min-h-[44px] min-w-[44px] items-center touch-manipulation pl-1">
        <ChevronLeft size={20} />
        <span>메인으로</span>
      </Link>

      <form onSubmit={handleLogin} className="w-full max-w-md space-y-6 sm:space-y-8 bg-white p-6 sm:p-10 md:p-12 rounded-3xl sm:rounded-[40px] shadow-2xl border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black italic text-blue-900 tracking-tighter uppercase leading-none">SPOKEDU</h1>
          <div className="h-1 w-12 bg-blue-600 mx-auto mt-4 rounded-full"></div>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.3em] mt-4">
            {showMasterTab ? 'SPOKEDU MASTER' : type === 'admin' ? 'System Administrator' : 'Physical Education Expert'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="로그인 방식">
          <button
            type="button"
            role="tab"
            aria-selected={showMasterTab}
            onClick={() => {
              setActiveTab('master');
              setLoginError(null);
              otp.setError(null);
              reportLoginUxEvent('login_tab_selected', { activeTab: 'master' });
            }}
            className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${
              showMasterTab ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            MASTER
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!showMasterTab}
            onClick={() => {
              setActiveTab('ops');
              setLoginError(null);
              otp.setError(null);
              reportLoginUxEvent('login_tab_selected', { activeTab: 'ops' });
            }}
            className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${
              !showMasterTab ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            강사·관리자
          </button>
        </div>

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
                onClick={() => setActiveTab('ops')}
                className="w-full text-center text-xs font-bold text-blue-700 hover:text-blue-950"
              >
                기존 계정으로 로그인
              </button>
            }
          />
        ) : (
          <>
            {type === 'admin' && (
              <p className="text-xs font-medium text-slate-500 leading-relaxed text-center">
                관리자 ID는 <span className="font-bold text-slate-700">choijihoon</span>,{' '}
                <span className="font-bold text-slate-700">kimkoomin</span>,{' '}
                <span className="font-bold text-slate-700">kimyoonki</span> 또는 해당 @spokedu.com 이메일입니다.
                <span className="block mt-1 text-slate-400">admin 입력 시 최지훈(choijihoon) 계정으로 연결됩니다.</span>
              </p>
            )}

            <div className="space-y-5">
              <div className="relative">
                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-5 mb-2 block italic">ID / NAME</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="아이디를 입력하세요"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    required={!showMasterTab}
                    className="w-full min-h-[48px] p-5 pl-14 bg-gray-50 rounded-3xl border-2 border-transparent font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-base sm:text-sm text-black touch-manipulation"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-5 mb-2 block italic">PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required={!showMasterTab}
                    className="w-full min-h-[48px] p-5 pl-14 bg-gray-50 rounded-3xl border-2 border-transparent font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-base sm:text-sm text-black touch-manipulation"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`block w-full min-h-[52px] py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] touch-manipulation ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? '연결 중... (최초 접속 시 1분 소요)' : 'Login'}
            </button>

            {prefersMasterTab && (
              <button
                type="button"
                onClick={() => setActiveTab('master')}
                className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-900"
              >
                이메일 인증으로 시작하기
              </button>
            )}
          </>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs font-medium text-gray-600">이 기기에서 로그인 유지</span>
        </label>

        {displayError && (
          <p className="text-sm font-bold text-red-500 text-center">{displayError}</p>
        )}

        <div className="space-y-2 text-center">
          <p className="text-[9px] font-bold text-gray-400 italic uppercase tracking-tighter">
            Play · Think · Flow with Spokedu
          </p>
          <p className="text-[9px] font-medium text-gray-300 uppercase">
            Yonsei University Physical Education Specialists
          </p>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginContent />
    </Suspense>
  );
}
