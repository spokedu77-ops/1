'use client';

import Link from 'next/link';
import { CheckCircle2, Gift, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { logoutCurrentSession } from '@/app/lib/auth/logoutSession';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { buildMasterLoginHref } from '../../lib/masterLoginReturn';

const INVITE_TOKEN_STORAGE_KEY = 'spokedu-master:promotion-invite-token';
const REDEEM_PATH = '/spokedu-lab/promotions/redeem';

type RedeemState = 'checking' | 'ready' | 'submitting' | 'success' | 'error';

function validInviteToken(value: string | null | undefined) {
  const token = value?.trim() ?? '';
  return token.length >= 32 && token.length <= 256 ? token : null;
}

function PromotionRedeemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteTokenParam = searchParams.get('token');
  const [state, setState] = useState<RedeemState>('checking');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('초대 정보를 확인하고 있습니다.');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const queryToken = validInviteToken(inviteTokenParam);
      if (queryToken) {
        window.sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, queryToken);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('token');
        window.history.replaceState(window.history.state, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
      }

      const inviteToken = queryToken
        ?? validInviteToken(window.sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY));
      if (!inviteToken) {
        if (!cancelled) {
          setState('error');
          setMessage('초대 링크가 올바르지 않거나 초대 정보가 사라졌습니다. 새 초대 링크를 요청해주세요.');
        }
        return;
      }

      const { data: { user } } = await getSupabaseBrowserClient().auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace(buildMasterLoginHref(REDEEM_PATH));
        return;
      }

      setEmail(user.email ?? '현재 로그인 계정');
      setState('ready');
      setMessage('현재 계정으로 초대 이용권을 등록할 수 있습니다.');
    })().catch(() => {
      if (!cancelled) {
        setState('error');
        setMessage('로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [inviteTokenParam, router]);

  const changeAccount = async () => {
    setState('checking');
    setMessage('로그아웃하고 있습니다.');
    await logoutCurrentSession();
    router.replace(buildMasterLoginHref(REDEEM_PATH));
  };

  const redeem = async () => {
    if (state === 'submitting') return;
    const token = validInviteToken(window.sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY));
    if (!token) {
      setState('error');
      setMessage('초대 정보가 사라졌습니다. 새 초대 링크를 요청해주세요.');
      return;
    }

    setState('submitting');
    setMessage('초대 이용권을 등록하고 있습니다.');
    try {
      const response = await fetch('/api/spokedu-master/promotions/redeem', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.status === 401) {
        router.replace(buildMasterLoginHref(REDEEM_PATH));
        return;
      }
      if (!response.ok) {
        setState('error');
        setMessage('초대가 만료·취소·사용되었거나 초대 이메일과 현재 계정이 다릅니다. 계정을 확인해주세요.');
        return;
      }

      window.sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
      setState('success');
      setMessage('초대 이용권이 등록되었습니다. 이제 SPOKEDU LAB을 이용할 수 있습니다.');
      router.refresh();
    } catch {
      setState('error');
      setMessage('초대 이용권을 등록하지 못했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.');
    }
  };

  const isBusy = state === 'checking' || state === 'submitting';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)' }}>
      <section className="w-full max-w-[520px] rounded-[20px] border p-6 sm:p-8" style={{ background: 'var(--spm-s1)', borderColor: 'var(--spm-br2)' }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: 'var(--spm-s2)', color: 'var(--spm-acc)' }}>
          {isSuccess ? <CheckCircle2 size={24} /> : isError ? <TriangleAlert size={24} /> : <Gift size={24} />}
        </div>
        <p className="mt-6 text-[12px] font-semibold" style={{ color: 'var(--spm-acc)' }}>SPOKEDU LAB 초대</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight sm:text-[32px]">
          {isSuccess ? '이용권 등록 완료' : '초대 이용권 등록'}
        </h1>
        <p aria-live="polite" className="mt-3 text-[15px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{message}</p>

        {email && !isSuccess ? (
          <div className="mt-6 flex items-start gap-3 rounded-[12px] p-4" style={{ background: 'var(--spm-s2)' }}>
            <ShieldCheck className="mt-0.5 shrink-0" size={19} style={{ color: 'var(--spm-acc)' }} />
            <div>
              <p className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>등록 계정</p>
              <p className="mt-1 break-all text-[14px] font-semibold">{email}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-7 grid gap-3">
          {state === 'ready' || state === 'submitting' ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void redeem()}
              className="spm-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold focus-visible:outline-none disabled:opacity-60"
            >
              {state === 'submitting' ? <Loader2 className="animate-spin" size={17} /> : null}
              {state === 'submitting' ? '등록 중...' : '초대 이용권 등록하기'}
            </button>
          ) : null}
          {email && !isSuccess && state !== 'checking' ? (
            <button
              type="button"
              onClick={() => void changeAccount()}
              className="inline-flex h-11 w-full items-center justify-center rounded-[12px] px-4 text-[14px] font-semibold"
              style={{ color: 'var(--spm-t2)' }}
            >
              다른 계정으로 로그인
            </button>
          ) : null}
          {state === 'checking' ? (
            <div className="flex min-h-12 items-center justify-center gap-2 text-[14px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
              <Loader2 className="animate-spin" size={17} /> 확인 중...
            </div>
          ) : null}
          {isError ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 w-full items-center justify-center rounded-[12px] border px-4 text-[14px] font-semibold"
              style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
            >
              다시 확인하기
            </button>
          ) : null}
          {isSuccess ? (
            <Link href="/spokedu-lab/dashboard" className="spm-btn-primary inline-flex h-12 w-full items-center justify-center rounded-[12px] px-4 text-[14px] font-semibold focus-visible:outline-none">
              SPOKEDU LAB 시작하기
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function PromotionRedeemPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" style={{ background: 'var(--spm-bg)' }} />}>
      <PromotionRedeemContent />
    </Suspense>
  );
}
