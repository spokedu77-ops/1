'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Shield, X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { useProfile } from '../store';

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (method: string, options: Record<string, unknown>) => void;
    };
  }
}

const PLANS = {
  pro: {
    title: 'Pro',
    price: '39,900',
    amount: 39900,
    period: '월',
    badge: '가장 인기',
    badgeColor: 'var(--spm-acc)',
    badgeBg: 'rgba(99,102,241,0.18)',
    description: '전문 강사가 매주 쓰는 수업 준비 환경',
    includes: [
      '전체 프로그램 라이브러리 무제한',
      'SPOMOVE 큰 화면 실행',
      '수업 도구 전체',
      '설명 문구 (학부모·기관·학교용)',
    ],
    accent: 'rgba(99,102,241,0.16)',
    border: 'rgba(99,102,241,0.40)',
    activeBorder: 'rgba(99,102,241,0.65)',
  },
  team: {
    title: 'Center',
    price: '79,000',
    amount: 79000,
    period: '월',
    badge: '강사 3명 포함',
    badgeColor: 'var(--spm-grn)',
    badgeBg: 'rgba(16,185,129,0.16)',
    description: '센터와 도장이 강사 수업 품질을 맞추는 플랜',
    includes: [
      'Pro 기능 전체',
      '강사 3명 계정 포함',
      '센터용 수업 도구',
      '추가 강사 확장 가능',
    ],
    accent: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    activeBorder: 'rgba(16,185,129,0.65)',
  },
} as const;

type PlanKey = keyof typeof PLANS;

function PlanToggle({ selected, onSelect }: { selected: PlanKey; onSelect: (k: PlanKey) => void }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-2">
      {(Object.keys(PLANS) as PlanKey[]).map((key) => {
        const p = PLANS[key];
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className="rounded-[14px] p-4 text-left transition-none active:scale-[0.98]"
            style={{
              background: active ? p.accent : 'var(--spm-s2)',
              border: `1.5px solid ${active ? p.activeBorder : 'var(--spm-br2)'}`,
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: active ? p.badgeColor : 'var(--spm-t3)' }}>{p.badge}</span>
              {active ? <span className="grid h-4 w-4 place-items-center rounded-full" style={{ background: p.badgeColor }}><CheckCircle2 size={10} color="#fff" strokeWidth={2.5} /></span> : <span className="grid h-4 w-4 place-items-center rounded-full" style={{ background: 'var(--spm-s3)', border: '1.5px solid var(--spm-br2)' }} />}
            </div>
            <p className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{p.title}</p>
            <p className="mt-0.5 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>
              {p.price}<span className="text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>원/{p.period}</span>
            </p>
          </button>
        );
      })}
    </div>
  );
}

function PaymentContent() {
  const params = useSearchParams();
  const profile = useProfile();
  const initialPlan = (params.get('plan') ?? 'pro') as PlanKey;
  const [planKey, setPlanKey] = useState<PlanKey>(PLANS[initialPlan] ? initialPlan : 'pro');
  const plan = PLANS[planKey];
  const alreadySubscribed = profile?.plan === 'pro' || profile?.plan === 'team';

  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1';
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setEmail(session.user.email);
          setIsAuthed(true);
        }
      } finally {
        setCheckingSession(false);
      }
    };
    void checkSession();
  }, []);

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

  const startTossPayment = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/spokedu-master/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const json = await res.json() as { orderId?: string; orderName?: string; amount?: number; customerEmail?: string; customerName?: string; error?: string };
      if (!res.ok || !json.orderId) { setError(json.error ?? '결제 준비 중 오류가 발생했습니다.'); return; }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';
      if (!clientKey || !window.TossPayments) {
        setError('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      const toss = window.TossPayments(clientKey);
      toss.requestPayment('카드', {
        amount: json.amount,
        orderId: json.orderId,
        orderName: json.orderName,
        customerEmail: json.customerEmail,
        customerName: json.customerName,
        successUrl: `${window.location.origin}/spokedu-master/payment/success`,
        failUrl: `${window.location.origin}/spokedu-master/payment/cancel`,
      });
      // requestPayment는 페이지를 리다이렉트하므로 이후 코드는 실행되지 않음
    } catch {
      setError('결제를 시작할 수 없습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  if (alreadySubscribed) {
    const activePlanLabel = profile?.plan === 'team' ? 'Center' : 'Pro';
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-[22px]" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
        <div className="w-full max-w-[400px] space-y-6 text-center">
          <CheckCircle2 size={56} color="var(--spm-grn)" strokeWidth={1.5} className="mx-auto" />
          <div>
            <h1 className="text-[26px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{activePlanLabel} 구독 중</h1>
            <p className="mt-3 text-[14px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>이미 활성 구독이 있습니다. 구독 관리 페이지에서 플랜 변경 또는 취소를 문의할 수 있습니다.</p>
          </div>
          <div className="space-y-2">
            <Link href="/spokedu-master/subscription" className="flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>구독 관리</Link>
            <Link href="/spokedu-master/dashboard" className="block text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>대시보드로 돌아가기</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="flex items-center gap-3 px-[22px] pb-5 pt-[22px] sm:px-8">
        <Link href="/spokedu-master/profile" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="뒤로">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU</p>
          <h1 className="text-[20px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>플랜 선택</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] space-y-4 px-[22px] pb-14 sm:px-8">
        <PlanToggle selected={planKey} onSelect={setPlanKey} />

        <div className="rounded-[18px] p-5" style={{ background: plan.accent, border: `1px solid ${plan.border}` }}>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: plan.badgeColor }}>{plan.badge}</span>
          </div>
          <div className="flex items-end justify-between">
            <h2 className="text-[26px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{plan.title}</h2>
            <div className="text-right">
              <span className="text-[24px] font-black" style={{ color: 'var(--spm-t)' }}>{plan.price}원</span>
              <span className="ml-1 text-[12px]" style={{ color: 'var(--spm-t3)' }}>/{plan.period}</span>
            </div>
          </div>
          <p className="mt-2 text-[13px] font-medium leading-5" style={{ color: 'var(--spm-t2)' }}>{plan.description}</p>
          <ul className="mt-4 space-y-2.5">
            {plan.includes.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                <CheckCircle2 size={14} color="var(--spm-grn)" strokeWidth={2} />{item}
              </li>
            ))}
          </ul>
        </div>

        {checkingSession ? (
          <div className="flex h-32 items-center justify-center rounded-[16px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <Loader2 size={20} className="animate-spin" color="var(--spm-t3)" />
          </div>
        ) : !isAuthed ? (
          <div className="space-y-3 rounded-[16px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div>
              <p className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>이메일로 계속</p>
              <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--spm-t3)' }}>결제 확인과 구독 관리를 위해 이메일 인증이 필요합니다.</p>
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
                <p className="text-[12px] font-semibold" style={{ color: 'var(--spm-grn)' }}>{email}로 6자리 코드를 보냈습니다.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="인증 코드 6자리"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') void verifyOtp(); }}
                  className="h-12 w-full rounded-[12px] border px-3 text-center text-[22px] font-black tracking-[0.3em] outline-none"
                  style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                />
                <button type="button" onClick={() => void verifyOtp()} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  인증 확인
                </button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="flex w-full items-center justify-center gap-1 py-1 text-[11px]" style={{ color: 'var(--spm-t3)' }}>
                  <X size={12} />다른 이메일로 다시 시도
                </button>
              </>
            )}
            {error ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
          </div>
        ) : (
          <div className="space-y-3 rounded-[16px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} color="var(--spm-grn)" />
              <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{email}</p>
            </div>
            <button type="button" onClick={() => void startTossPayment()} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-[13px] py-4 text-[15px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)', boxShadow: '0 10px 28px rgba(99,102,241,0.32)' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              카드로 결제 — {plan.price}원/{plan.period}
            </button>
            {error ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-[14px] px-4 py-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
          <Shield size={14} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
          <p className="text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
            토스페이먼츠 보안 결제 · 언제든지 취소 가능 · 다음 결제일 전 취소 시 요금 없음 · 데이터는 암호화되어 저장됩니다.
          </p>
        </div>

        <p className="text-center text-[11px]" style={{ color: 'var(--spm-t3)' }}>
          <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-t3)' }}>이용약관</Link>
          <span className="mx-2">·</span>
          <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-t3)' }}>개인정보처리방침</Link>
          <span className="mx-2">·</span>
          <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>문의하기</a>
        </p>

        <div className="rounded-[12px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-t3)' }}>사업자 정보</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {[
              ['상호', '스포케듀'],
              ['대표자', '최지훈'],
              ['사업자등록번호', '311-63-00356'],
              ['통신판매업신고', '신청 중'],
              ['주소', '서울특별시 강동구 성내동 430-2, 7층 2호'],
              ['고객센터', 'support@spokedu.com'],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</dt>
                <dd className="text-[10px] font-medium" style={{ color: 'var(--spm-t2)' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
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
