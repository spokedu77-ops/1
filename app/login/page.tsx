'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Lock, User } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { parseSafeNextRedirect } from '@/app/lib/auth/safeNextRedirect';
import { resolvePostLoginRedirect } from '@/app/lib/auth/postLoginRedirect';
import { resolveLoginEmail } from '@/app/lib/auth/loginEmail';
import { applyLoginSessionPreference, enforceSessionOnlyPolicy, readKeepLoggedInPreference } from '@/app/lib/auth/sessionPersistence';
import { rememberLastUsedAppFromPath } from '@/app/lib/auth/lastUsedApp';
import { reportLoginUxEvent } from '@/app/lib/auth/loginUxTelemetry';
import { isRefreshTokenError } from '@/app/lib/supabase/auth';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const type = params.get('type') || 'teacher';
  const nextSafe = parseSafeNextRedirect(params.get('next'));

  useEffect(() => { setKeepLoggedIn(readKeepLoggedInPreference()); }, []);

  useEffect(() => {
    if (nextSafe?.startsWith('/spokedu-master')) {
      router.replace(`/spokedu-master/login?next=${encodeURIComponent(nextSafe)}`);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await enforceSessionOnlyPolicy(() => supabase.auth.signOut());
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError && isRefreshTokenError(sessionError)) await supabase.auth.signOut();
        else if (data.session?.user) {
          const redirectPath = await resolvePostLoginRedirect(nextSafe, supabase, data.session.user);
          reportLoginUxEvent('auto_redirect_from_login', { redirectPath, activeTab: 'ops' });
          if (!cancelled) router.replace(redirectPath);
          return;
        }
      } catch { /* 로그인 폼에서 다시 시도 */ }
      if (!cancelled) setSessionChecked(true);
    })();
    return () => { cancelled = true; };
  }, [nextSafe, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const loginEmail = resolveLoginEmail(id);
      let result = await supabase.auth.signInWithPassword({ email: loginEmail, password: pw });
      if (result.error) result = await supabase.auth.signInWithPassword({ email: loginEmail, password: pw.replace(/-/g, '') });
      if (result.error || !result.data.user) { setError('로그인 정보를 다시 확인해 주세요.'); return; }
      applyLoginSessionPreference(keepLoggedIn);
      const destination = await resolvePostLoginRedirect(nextSafe, supabase, result.data.user);
      if (type === 'admin' && !nextSafe && destination !== '/admin') {
        await supabase.auth.signOut();
        setError('관리자 권한이 없는 계정입니다.');
        return;
      }
      rememberLastUsedAppFromPath(destination);
      router.push(destination);
      router.refresh();
    } catch { setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setLoading(false); }
  };

  if (!sessionChecked) return <main className="min-h-dvh bg-slate-950" aria-label="로그인 상태 확인 중" />;

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 px-5 py-10 text-slate-100">
      <section className="w-full max-w-[440px] rounded-[24px] border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-400 hover:text-white"><ChevronLeft size={17} /> 메인으로</Link>
        <p className="mt-6 text-xs font-semibold text-sky-300">SPOKEDU 운영 계정</p>
        <h1 className="mt-2 text-3xl font-bold">강사·관리자 로그인</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-400">기존 강사 앱과 운영·관리자 콘솔 전용 로그인입니다.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-300">아이디</span><span className="relative block"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input value={id} onChange={(event) => setId(event.target.value)} required autoComplete="username" className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-12 pr-4 text-sm font-semibold outline-none focus:border-sky-500" /></span></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-300">비밀번호</span><span className="relative block"><Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="password" value={pw} onChange={(event) => setPw(event.target.value)} required autoComplete="current-password" className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-12 pr-4 text-sm font-semibold outline-none focus:border-sky-500" /></span></label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-300"><input type="checkbox" checked={keepLoggedIn} onChange={(event) => setKeepLoggedIn(event.target.checked)} />이 기기에서 로그인 유지</label>
          <button type="submit" disabled={loading} className="min-h-12 w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60">{loading ? '로그인 중...' : '로그인'}</button>
          {error ? <p className="rounded-xl bg-red-950/50 px-3 py-2 text-center text-sm font-semibold text-red-200">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-dvh bg-slate-950" />}><LoginContent /></Suspense>;
}
