'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

const PLANS = {
  pro: {
    title: 'Pro',
    price: '39,900원',
    period: '월',
    badge: '추천',
    description: '전문 강사가 매주 쓰는 수업 준비 환경',
    includes: ['전체 프로그램 라이브러리', 'SPOMOVE 무제한 실행', '수업 설명 도구 전체', '즐겨찾기와 최근 사용'],
    accent: 'rgba(99,102,241,0.18)',
    border: 'rgba(99,102,241,0.44)',
  },
  team: {
    title: 'Center',
    price: '79,000원',
    period: '월',
    badge: '강사 3명 포함',
    description: '센터와 도장이 강사 수업 품질을 맞추는 플랜',
    includes: ['Pro 기능 전체', '강사 3명 계정 포함', '센터용 설명 도구', '추가 강사 확장 가능'],
    accent: 'rgba(16,185,129,0.14)',
    border: 'rgba(16,185,129,0.4)',
  },
} as const;

type PlanKey = keyof typeof PLANS;

function PaymentContent() {
  const params = useSearchParams();
  const router = useRouter();
  const planKey = (params.get('plan') ?? 'pro') as PlanKey;
  const plan = PLANS[planKey] ?? PLANS.pro;

  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    if (!email.includes('@')) { setError('올바른 이메일을 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (authError) { setError(authError.message); return; }
      setOtpSent(true);
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setError('6자리 인증 코드를 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (authError) { setError('인증 코드가 올바르지 않습니다.'); return; }
      setIsAuthed(true);
    } finally { setLoading(false); }
  };

  const startCheckout = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/spokedu-master/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) { setError(json.error ?? '결제 준비 중 오류가 발생했습니다.'); return; }
      router.push(json.url);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="flex items-center gap-3 px-[22px] pb-6 pt-[22px] sm:px-8">
        <Link href="/spokedu-master/profile" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="뒤로">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU PRO</p>
          <h1 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>플랜 결제</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] space-y-5 px-[22px] sm:px-8">
        {/* Plan card */}
        <div className="rounded-[18px] p-5" style={{ background: plan.accent, border: `1px solid ${plan.border}` }}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>{plan.badge}</span>
              <h2 className="mt-1 text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{plan.title}</h2>
            </div>
            <div className="text-right">
              <span className="text-[22px] font-black" style={{ color: 'var(--spm-t)' }}>{plan.price}</span>
              <span className="ml-1 text-[12px]" style={{ color: 'var(--spm-t3)' }}>/{plan.period}</span>
            </div>
          </div>
          <p className="mt-3 text-[13px] font-medium leading-5" style={{ color: 'var(--spm-t2)' }}>{plan.description}</p>
          <ul className="mt-4 space-y-2">
            {plan.includes.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                <CheckCircle2 size={14} color="var(--spm-grn)" />{item}
              </li>
            ))}
          </ul>
        </div>

        {/* Auth or checkout */}
        {!isAuthed ? (
          <div className="space-y-3 rounded-[16px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div>
              <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>이메일로 계속</p>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--spm-t3)' }}>결제 확인과 구독 관리를 위해 이메일 인증이 필요합니다.</p>
            </div>
            {!otpSent ? (
              <>
                <input
                  type="email"
                  placeholder="이메일 주소"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void sendOtp(); }}
                  className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-semibold outline-none"
                  style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                />
                <button type="button" onClick={() => void sendOtp()} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  인증 코드 받기
                </button>
              </>
            ) : (
              <>
                <p className="text-[12px] font-medium" style={{ color: 'var(--spm-grn)' }}>{email}로 6자리 코드를 보냈습니다.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="인증 코드 6자리"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') void verifyOtp(); }}
                  className="h-12 w-full rounded-[12px] border px-3 text-center text-[20px] font-black tracking-[0.3em] outline-none"
                  style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                />
                <button type="button" onClick={() => void verifyOtp()} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  인증 확인
                </button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="w-full text-center text-[11px]" style={{ color: 'var(--spm-t3)' }}>
                  다른 이메일로 다시 시도
                </button>
              </>
            )}
            {error ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
          </div>
        ) : (
          <div className="space-y-3 rounded-[16px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} color="var(--spm-grn)" />
              <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{email} 인증 완료</p>
            </div>
            <button type="button" onClick={() => void startCheckout()} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px rgba(99,102,241,0.32)' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              카드로 결제하기 — {plan.price}/{plan.period}
            </button>
            {error ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
            <p className="text-[10px] leading-5" style={{ color: 'var(--spm-t3)' }}>
              Stripe 보안 결제 · 언제든지 취소 가능 · 다음 결제일 전 취소 시 요금 없음
            </p>
          </div>
        )}

        <p className="text-center text-[11px]" style={{ color: 'var(--spm-t3)' }}>
          문의: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a>
        </p>
        <p className="text-center text-[10px]" style={{ color: 'var(--spm-t3)' }}>
          <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-t3)' }}>이용약관</Link>
          <span className="mx-2">·</span>
          <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-t3)' }}>개인정보처리방침</Link>
        </p>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense>
      <PaymentContent />
    </Suspense>
  );
}
