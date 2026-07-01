'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, User, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { isRefreshTokenError } from '@/app/lib/supabase/auth';
import { parseSafeNextRedirect } from '@/app/lib/auth/safeNextRedirect';
import { resolvePostLoginRedirect } from '@/app/lib/auth/postLoginRedirect';
import { resolveLoginEmail } from '@/app/lib/auth/loginEmail';

function LoginContent() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [trialEmail, setTrialEmail] = useState('');
  const [trialOtp, setTrialOtp] = useState('');
  const [trialOtpSent, setTrialOtpSent] = useState(false);
  const [trialMessage, setTrialMessage] = useState<string | null>(null);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 접속 유형(teacher/admin) 파악
  const type = searchParams.get('type') || 'teacher';
  const nextSafe = parseSafeNextRedirect(searchParams.get('next'));
  const isSpokeduMasterTrialNext =
    nextSafe === '/spokedu-master/onboarding' ||
    nextSafe === '/spokedu-master/profile' ||
    (nextSafe != null && nextSafe.startsWith('/spokedu-master/profile?'));
  const isTrialMode = type !== 'admin' && (searchParams.get('mode') === 'trial' || isSpokeduMasterTrialNext);
  const showTrialLogin = isTrialMode && !showPasswordLogin;

  // 페이지 로드 시 리프레시 토큰이 무효한 경우에만 세션 클리어
  // 3초 타임아웃: getSession()이 토큰 갱신 네트워크 호출로 auth lock을 점유해
  // 이후 signInWithPassword가 무한 대기하는 것을 방지
  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000)
        );
        const sessionPromise = supabase.auth.getSession();
        const { error: sessionError } = await Promise.race([sessionPromise, timeoutPromise]);
        if (sessionError && isRefreshTokenError(sessionError)) {
          await supabase.auth.signOut();
        }
      } catch {
        // 타임아웃 또는 에러 시 무시하고 로그인 폼 정상 표시
      }
    };
    checkInitialSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const loginEmail = resolveLoginEmail(id);
      const rawPw = pw.replace(/-/g, '');

      // 90초 타임아웃: Supabase cold start(프로젝트 재시작) 대기 포함
      const timeout = (ms: number) =>
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), ms)
        );

      // A. 1차 로그인 시도
      let signInResult = await Promise.race([
        supabase.auth.signInWithPassword({ email: loginEmail, password: pw }),
        timeout(90000),
      ]);
      let { data, error } = signInResult;

      // B. 실패 시 하이픈 제거 버전으로 2차 시도
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

      // 로그인 성공: signInWithPassword의 data.user 직접 사용 (getUser() 추가 호출 제거)
      const loggedInUser = data?.user;

      if (loggedInUser) {
        const redirectPath = await resolvePostLoginRedirect(nextSafe, supabase, loggedInUser);

        if (type === 'admin' && !nextSafe && redirectPath !== '/admin') {
          setLoginError('관리자 권한이 없는 계정입니다. 등록된 관리자 계정으로 로그인해 주세요.');
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        router.push(redirectPath);
        router.refresh();
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

  const sendTrialOtp = async () => {
    const email = trialEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      setLoginError('무료 체험을 이어갈 이메일 주소를 입력해 주세요.');
      return;
    }
    setIsLoading(true);
    setLoginError(null);
    setTrialMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        setLoginError(error.message);
        return;
      }
      setTrialOtpSent(true);
      setTrialMessage(`${email}로 6자리 인증 코드를 보냈습니다.`);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTrialOtp = async () => {
    const email = trialEmail.trim().toLowerCase();
    if (!email.includes('@') || trialOtp.trim().length < 6) {
      setLoginError('이메일로 받은 6자리 인증 코드를 입력해 주세요.');
      return;
    }
    setIsLoading(true);
    setLoginError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: trialOtp.trim(),
        type: 'email',
      });
      if (error) {
        setLoginError('인증 코드가 올바르지 않습니다. 다시 확인해 주세요.');
        return;
      }
      const loggedInUser = data.user ?? (await supabase.auth.getUser()).data.user;
      const redirectPath = await resolvePostLoginRedirect(nextSafe, supabase, loggedInUser ?? undefined);
      router.push(redirectPath);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)] relative">
      {/* 뒤로가기 버튼 - 터치 영역 확보 */}
      <Link href="/" className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold text-sm min-h-[44px] min-w-[44px] items-center touch-manipulation pl-1">
        <ChevronLeft size={20} />
        <span>메인으로</span>
      </Link>

      <form onSubmit={handleLogin} className="w-full max-w-md space-y-6 sm:space-y-8 bg-white p-6 sm:p-10 md:p-12 rounded-3xl sm:rounded-[40px] shadow-2xl border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black italic text-blue-900 tracking-tighter uppercase leading-none">SPOKEDU</h1>
          <div className="h-1 w-12 bg-blue-600 mx-auto mt-4 rounded-full"></div>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.3em] mt-4">
            {showTrialLogin ? 'SPOKEDU MASTER Trial' : type === 'admin' ? 'System Administrator' : 'Physical Education Expert'}
          </p>
          {type === 'admin' && (
            <p className="mt-4 text-xs font-medium text-slate-500 leading-relaxed">
              관리자 ID는 <span className="font-bold text-slate-700">choijihoon</span>,{' '}
              <span className="font-bold text-slate-700">kimkoomin</span>,{' '}
              <span className="font-bold text-slate-700">kimyoonki</span> 또는 해당 @spokedu.com 이메일입니다.
              <span className="block mt-1 text-slate-400">admin 입력 시 최지훈(choijihoon) 계정으로 연결됩니다.</span>
            </p>
          )}
        </div>

        {showTrialLogin && (
          <div className="space-y-4 rounded-3xl border border-blue-100 bg-blue-50/80 p-4">
            <div>
              <p className="text-lg font-black text-blue-950">SPOKEDU MASTER 무료 체험 시작</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-blue-900/80">
                이메일 인증 후 14일 무료 체험 설정을 이어갑니다. 기존 계정이 있다면 같은 이메일로 로그인됩니다.
              </p>
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
              <input
                type="email"
                placeholder="이메일 주소를 입력해 주세요"
                value={trialEmail}
                onChange={(e) => setTrialEmail(e.target.value)}
                className="w-full min-h-[48px] rounded-2xl border-2 border-transparent bg-white p-4 pl-12 text-base font-bold text-black outline-none transition-all focus:border-blue-600"
              />
            </div>
            {trialOtpSent && (
              <input
                inputMode="numeric"
                maxLength={6}
                placeholder="6자리 인증 코드"
                value={trialOtp}
                onChange={(e) => setTrialOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter') void verifyTrialOtp(); }}
                className="w-full min-h-[48px] rounded-2xl border-2 border-transparent bg-white p-4 text-base font-bold text-black outline-none transition-all focus:border-blue-600"
              />
            )}
            {trialMessage && <p className="text-xs font-bold text-blue-700">{trialMessage}</p>}
            <button
              type="button"
              onClick={() => void (trialOtpSent ? verifyTrialOtp() : sendTrialOtp())}
              disabled={isLoading}
              className="w-full min-h-[48px] rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:opacity-70"
            >
              {isLoading ? '인증 처리 중...' : trialOtpSent ? '무료 체험 계속하기' : '인증 코드 받기'}
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordLogin(true)}
              className="w-full text-center text-xs font-bold text-blue-700 hover:text-blue-950"
            >
              기존 계정으로 로그인
            </button>
          </div>
        )}

        <div className={showTrialLogin ? 'hidden' : 'space-y-5'}>
          {/* 아이디 입력란 */}
          <div className="relative">
            <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-5 mb-2 block italic">ID / NAME</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="아이디를 입력하세요" 
                value={id} 
                onChange={(e) => setId(e.target.value)} 
                required
                className="w-full min-h-[48px] p-5 pl-14 bg-gray-50 rounded-3xl border-2 border-transparent font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-base sm:text-sm text-black touch-manipulation" 
              />
            </div>
          </div>

          {/* 비밀번호 입력란 */}
          <div className="relative">
            <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-5 mb-2 block italic">PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                placeholder="비밀번호를 입력하세요" 
                value={pw} 
                onChange={(e) => setPw(e.target.value)} 
                required
                className="w-full min-h-[48px] p-5 pl-14 bg-gray-50 rounded-3xl border-2 border-transparent font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-base sm:text-sm text-black touch-manipulation" 
              />
            </div>
          </div>
        </div>

        <label className={showTrialLogin ? 'hidden' : 'flex items-center gap-3 cursor-pointer'}>
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs font-medium text-gray-600">이 기기에서 로그인 유지</span>
        </label>

        {loginError && (
          <p className="text-sm font-bold text-red-500 text-center">{loginError}</p>
        )}

        <button 
          type="submit" 
          disabled={isLoading}
          className={`${showTrialLogin ? 'hidden' : 'block'} w-full min-h-[52px] py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] touch-manipulation ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? '연결 중... (최초 접속 시 1분 소요)' : 'Login'}
        </button>

        {isTrialMode && showPasswordLogin && (
          <button
            type="button"
            onClick={() => setShowPasswordLogin(false)}
            className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-900"
          >
            이메일 인증으로 무료 체험 시작
          </button>
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

// Next.js에서 useSearchParams를 사용하려면 Suspense로 감싸야 배포 에러가 없습니다.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginContent />
    </Suspense>
  );
}
