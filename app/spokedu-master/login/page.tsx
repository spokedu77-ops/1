'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { MasterEmailOtpForm } from '@/app/components/auth/MasterEmailOtpForm';
import { ManualCredentialInput, SavedCredentialDecoy } from '@/app/components/auth/ManualCredentialInput';
import { useMasterEmailOtp } from '@/app/components/auth/useMasterEmailOtp';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { applyLoginSessionPreference, clearLoginSessionMarkers } from '@/app/lib/auth/sessionPersistence';
import { SPOKEDU_PATHS } from '@/app/spokedu/data/public-routes';
import {
  getSafeMasterLoginReturnPath,
  resolveMasterEntryAccess,
  type MasterEntryAccess,
} from '../lib/masterLoginReturn';
import { isTossReviewLoginEnabled } from './reviewLogin';

const TOSS_REVIEW_LOGIN_ENABLED = isTossReviewLoginEnabled(
  process.env.NEXT_PUBLIC_TOSS_REVIEW_LOGIN_ENABLED,
);

async function resolveMasterDestination(next: string) {
  const response = await fetch('/api/spokedu-master/access', {
    cache: 'no-store',
    credentials: 'include',
  });
  const access = response.ok
    ? await response.json() as MasterEntryAccess
    : null;
  const decision = resolveMasterEntryAccess(response.status, access, next);
  if (decision.clearBrowserSession) {
    await getSupabaseBrowserClient().auth.signOut({ scope: 'local' }).catch(() => undefined);
    clearLoginSessionMarkers();
  }
  return decision.destination;
}

function MasterLoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const otp = useMasterEmailOtp();
  const [checking, setChecking] = useState(true);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewPassword, setReviewPassword] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const next = getSafeMasterLoginReturnPath(params.get('next'));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const destination = await resolveMasterDestination(next);
      if (!cancelled && destination) router.replace(destination);
    })().finally(() => {
      if (!cancelled) setChecking(false);
    });
    return () => { cancelled = true; };
  }, [next, router]);

  const startKakao = async () => {
    setOauthError(null);
    setOauthLoading(true);
    // OAuth provider allowlists keep the established callback URL during the LAB route migration.
    const callback = new URL('/spokedu-master/auth/callback', window.location.origin);
    callback.searchParams.set('next', next);
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: callback.toString() },
      });
      if (error) throw error;
    } catch {
      setOauthError('카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도하거나 이메일로 시작해 주세요.');
      setOauthLoading(false);
    }
  };

  const submitEmail = async () => {
    setOauthError(null);
    const result = await otp.submit();
    if (!result.ok || result.kind === 'sent') return;
    applyLoginSessionPreference(true);
    const destination = await resolveMasterDestination(next);
    if (destination) router.replace(destination);
    router.refresh();
  };

  const submitReviewLogin = async () => {
    if (!TOSS_REVIEW_LOGIN_ENABLED || reviewLoading) return;
    setReviewError(null);
    setReviewLoading(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email: reviewEmail.trim(),
        password: reviewPassword,
      });
      if (error) {
        setReviewPassword('');
        setReviewError('이메일 또는 비밀번호를 확인해 주세요.');
        return;
      }
      applyLoginSessionPreference(true);
      const destination = await resolveMasterDestination(next);
      if (destination) router.replace(destination);
      router.refresh();
    } catch {
      setReviewPassword('');
      setReviewError('로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <main className="min-h-dvh px-5 py-8 sm:grid sm:place-items-center" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)' }}>
      <section className="relative mx-auto w-full max-w-[460px] rounded-[20px] p-6 sm:p-8" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
        <SavedCredentialDecoy />
        <Link href={SPOKEDU_PATHS.subscription} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
          <ChevronLeft size={17} /> 소개로 돌아가기
        </Link>
        <p className="mt-5 text-[11px] font-semibold" style={{ color: 'var(--spm-acc)' }}>SPOKEDU LAB</p>
        <h1 className="mt-2 text-[30px] font-bold leading-tight">수업 준비를 이어가세요</h1>
        <p className="mt-3 text-[14px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          비밀번호 없이 카카오 또는 이메일 인증으로 시작합니다.
        </p>

        <button
          type="button"
          onClick={() => void startKakao()}
          disabled={checking || oauthLoading}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-[12px] px-4 text-[14px] font-bold disabled:opacity-60"
          style={{ background: '#FEE500', color: '#191919' }}
        >
          {oauthLoading ? <Loader2 size={17} className="mr-2 animate-spin" /> : null}
          카카오로 시작하기
        </button>

        <div className="my-6 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1" style={{ background: 'var(--spm-br2)' }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>또는</span>
          <span className="h-px flex-1" style={{ background: 'var(--spm-br2)' }} />
        </div>

        <MasterEmailOtpForm
          email={otp.email}
          otp={otp.otp}
          otpSent={otp.otpSent}
          loading={otp.loading || checking}
          message={otp.message}
          description="이메일로 받은 6자리 인증 코드를 입력하면 가입과 로그인이 함께 처리됩니다."
          onEmailChange={otp.setEmail}
          onOtpChange={otp.setOtp}
          onSubmit={() => void submitEmail()}
        />
        {TOSS_REVIEW_LOGIN_ENABLED ? (
          <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--spm-br2)' }}>
            <h2 className="text-[16px] font-semibold">심사용 ID/PW 로그인</h2>
            <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--spm-t3)' }}>
              토스페이먼츠 심사용으로 제공받은 계정 정보를 입력해 주세요.
            </p>
            <form
              className="relative mt-4 space-y-3"
              autoComplete="off"
              onSubmit={(event) => {
                event.preventDefault();
                void submitReviewLogin();
              }}
            >
              <SavedCredentialDecoy />
              <label className="block text-[13px] font-semibold">
                이메일
                <ManualCredentialInput
                  type="text"
                  inputMode="email"
                  name="spk-review-account"
                  required
                  value={reviewEmail}
                  onValueChange={setReviewEmail}
                  disabled={reviewLoading || checking}
                  className="mt-1.5 h-12 w-full rounded-[10px] border px-3 text-[14px] font-normal outline-none focus:ring-2 focus:ring-[var(--spm-acc)] disabled:opacity-60"
                  style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)', color: 'var(--spm-t)' }}
                />
              </label>
              <label className="block text-[13px] font-semibold">
                비밀번호
                <ManualCredentialInput
                  type="password"
                  name="spk-review-secret"
                  required
                  value={reviewPassword}
                  onValueChange={setReviewPassword}
                  disabled={reviewLoading || checking}
                  className="mt-1.5 h-12 w-full rounded-[10px] border px-3 text-[14px] font-normal outline-none focus:ring-2 focus:ring-[var(--spm-acc)] disabled:opacity-60"
                  style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)', color: 'var(--spm-t)' }}
                />
              </label>
              <button
                type="submit"
                disabled={reviewLoading || checking || !reviewEmail.trim() || !reviewPassword}
                className="spm-btn-primary inline-flex min-h-12 w-full items-center justify-center rounded-[12px] px-4 text-[14px] font-semibold disabled:opacity-60"
              >
                {reviewLoading ? <Loader2 size={17} className="mr-2 animate-spin" aria-hidden /> : null}
                심사용 계정으로 로그인
              </button>
            </form>
            {reviewError ? (
              <p role="alert" className="mt-3 rounded-[10px] px-3 py-2 text-[13px] font-semibold" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--spm-red)' }}>
                {reviewError}
              </p>
            ) : null}
          </div>
        ) : null}
        {oauthError || otp.error ? (
          <p className="mt-4 rounded-[10px] px-3 py-2 text-[13px] font-semibold" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--spm-red)' }}>
            {oauthError ?? otp.error}
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default function MasterLoginPage() {
  return <Suspense fallback={<main className="min-h-dvh" style={{ background: 'var(--spm-bg)' }} />}><MasterLoginContent /></Suspense>;
}
