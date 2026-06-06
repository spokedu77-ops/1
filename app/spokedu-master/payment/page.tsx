'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  MonitorPlay,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { isPaidMasterPlan } from '../lib/subscription';
import { useMasterStore, useProfile } from '../store';

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (method: string, options: Record<string, unknown>) => void;
    };
  }
}

type PlanKey = 'pro' | 'team';
type SubscriptionGuardState = 'checking' | 'active' | 'inactive' | 'failed' | 'no-session';

const PLANS: Record<PlanKey, {
  title: string;
  shortTitle: string;
  price: string;
  amount: number;
  period: string;
  badge: string;
  description: string;
  primaryFor: string;
  includes: string[];
  accent: string;
  border: string;
  activeBorder: string;
  badgeColor: string;
}> = {
  pro: {
    title: 'SPOKEDU MASTER Pro',
    shortTitle: 'Pro',
    price: '39,900',
    amount: 39900,
    period: '30일',
    badge: '개인 강사 추천',
    description: '수업 라이브러리, SPOMOVE 큰 화면, 설명 문구까지 개인 강사가 바로 쓰는 표준 플랜입니다.',
    primaryFor: '개인 강사, 프리랜서 체육교육자, 소규모 클래스 운영자',
    includes: [
      '전체 프로그램 라이브러리',
      'SPOMOVE 큰 화면 실행',
      '수업 설명 문구와 기관용 문구',
      '최근 사용·즐겨찾기·추천 수업',
    ],
    accent: 'rgba(99,102,241,0.16)',
    border: 'rgba(99,102,241,0.36)',
    activeBorder: 'rgba(99,102,241,0.72)',
    badgeColor: 'var(--spm-acc)',
  },
  team: {
    title: 'SPOKEDU MASTER Center',
    shortTitle: 'Center',
    price: '79,000',
    amount: 79000,
    period: '30일',
    badge: '기관·센터용',
    description: '여러 수업을 운영하는 센터·기관 운영자가 수업 자료와 설명 문구를 활용하는 플랜입니다.',
    primaryFor: '센터, 도장, 체육관, 기관 수업 운영자',
    includes: [
      'Pro 기능 전체',
      '센터 수업 준비 자료 활용',
      '기관 제출용 수업 설명 문구',
      '추가 계정·기관 도입 별도 문의',
    ],
    accent: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.34)',
    activeBorder: 'rgba(16,185,129,0.70)',
    badgeColor: 'var(--spm-grn)',
  },
};

const VALUE_CARDS = [
  {
    icon: BookOpen,
    title: '수업 준비',
    body: '라이브러리에서 수업안을 고르고 준비물, 공간, 진행 단계를 한 번에 확인합니다.',
  },
  {
    icon: MonitorPlay,
    title: '수업 몰입',
    body: 'SPOMOVE를 큰 화면에 켜고 학생들이 신호를 보고 바로 움직이는 수업을 만듭니다.',
  },
  {
    icon: FileText,
    title: '수업 설명',
    body: '학부모, 기관, 학교에 수업 가치를 설명하는 문구를 바로 복사해 씁니다.',
  },
];

const OUTCOME_STATS = [
  { label: '매주 추천 수업', value: '4개', caption: '수업안 3개 + 화면 활동 1개' },
  { label: '수업 준비 흐름', value: '3단계', caption: '고르기, 실행하기, 설명하기' },
  { label: '바로 쓰는 자료', value: '5종', caption: '수업안, 영상, 준비물, 세팅, 문구' },
];

function normalizePlan(value: string | null): PlanKey {
  return value === 'team' ? 'team' : 'pro';
}

function PlanSelector({ selected, onSelect }: { selected: PlanKey; onSelect: (plan: PlanKey) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(Object.keys(PLANS) as PlanKey[]).map((key) => {
        const plan = PLANS[key];
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className="rounded-[18px] p-5 text-left transition-none active:scale-[0.99]"
            style={{
              background: active ? plan.accent : 'var(--spm-s2)',
              border: `1.5px solid ${active ? plan.activeBorder : 'var(--spm-br2)'}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black" style={{ color: active ? plan.badgeColor : 'var(--spm-t3)' }}>{plan.badge}</p>
                <p className="mt-2 text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{plan.shortTitle}</p>
              </div>
              <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: active ? plan.badgeColor : 'var(--spm-s3)', border: active ? 'none' : '1px solid var(--spm-br2)' }}>
                {active ? <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} /> : null}
              </span>
            </div>
            <p className="mt-4 text-[24px] font-black" style={{ color: 'var(--spm-t)' }}>
              {plan.price}원<span className="ml-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>/{plan.period}</span>
            </p>
            <p className="mt-3 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{plan.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function PaymentContent() {
  const params = useSearchParams();
  const profile = useProfile();
  const syncSubscription = useMasterStore((state) => state.syncSubscription);
  const [planKey, setPlanKey] = useState<PlanKey>(normalizePlan(params.get('plan')));
  const plan = PLANS[planKey];
  const localAlreadySubscribed = isPaidMasterPlan(profile);

  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [subscriptionGuard, setSubscriptionGuard] = useState<SubscriptionGuardState>('checking');
  const [serverPlan, setServerPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState('');
  const alreadySubscribed =
    subscriptionGuard === 'active' ||
    ((subscriptionGuard === 'failed' || subscriptionGuard === 'no-session') && localAlreadySubscribed);

  const orderSummary = useMemo(() => {
    return {
      name: plan.title,
      price: `${plan.price}원/${plan.period}`,
      target: plan.primaryFor,
    };
  }, [plan]);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-toss-payments="true"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1';
    script.dataset.tossPayments = 'true';
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setEmail(session.user.email);
          setIsAuthed(true);
          try {
            const res = await fetch('/api/spokedu-master/subscription', { cache: 'no-store' });
            const json = await res.json() as { plan?: string; status?: string; isAdmin?: boolean };
            const activePlan = json.status === 'active' && (json.plan === 'pro' || json.plan === 'team' || json.isAdmin);
            if (activePlan) {
              setServerPlan(json.plan === 'team' || json.isAdmin ? 'team' : 'pro');
              setSubscriptionGuard('active');
            } else {
              setSubscriptionGuard('inactive');
              void syncSubscription();
            }
          } catch {
            setSubscriptionGuard('failed');
          }
        } else {
          setSubscriptionGuard('no-session');
        }
      } catch {
        setSubscriptionGuard('failed');
      } finally {
        setCheckingSession(false);
      }
    };
    void checkSession();
  }, [syncSubscription]);

  const sendOtp = async () => {
    if (!email.includes('@')) {
      setError('결제 확인에 사용할 이메일 주소를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (authError) {
        setError(authError.message);
        return;
      }
      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) {
      setError('이메일로 받은 6자리 인증 코드를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (authError) {
        setError('인증 코드가 올바르지 않습니다. 다시 확인해 주세요.');
        return;
      }
      setIsAuthed(true);
      void syncSubscription();
    } finally {
      setLoading(false);
    }
  };

  const startTossPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/spokedu-master/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const json = await res.json() as {
        orderId?: string;
        orderName?: string;
        amount?: number;
        customerEmail?: string;
        customerName?: string;
        error?: string;
      };
      if (!res.ok || !json.orderId) {
        setError(json.error ?? '결제를 준비하는 중 문제가 발생했습니다.');
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';
      if (!clientKey || !window.TossPayments) {
        setError('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
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
    } catch {
      setError('결제를 시작하지 못했습니다. 다시 시도해 주세요.');
      setLoading(false);
    }
  };

  if (alreadySubscribed) {
    const activePlanLabel = (serverPlan ?? profile?.plan) === 'team' ? 'Center' : 'Pro';
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
        <div className="w-full max-w-[440px] space-y-6 text-center">
          <CheckCircle2 size={58} color="var(--spm-grn)" strokeWidth={1.5} className="mx-auto" />
          <div>
            <h1 className="text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{activePlanLabel} 이용권을 사용 중입니다</h1>
            <p className="mt-3 text-[14px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
              이미 활성 이용권이 있습니다. 플랜 변경이나 결제 관련 문의는 이용권 확인 화면에서 이어갈 수 있습니다.
            </p>
          </div>
          <div className="space-y-2">
            <Link href="/spokedu-master/subscription" className="flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
              이용권 확인으로 이동
            </Link>
            <Link href="/spokedu-master/dashboard" className="block text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-5 pb-4 pt-5 sm:px-8">
        <Link href="/spokedu-master/subscription" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="이전 화면">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[21px] font-black leading-tight sm:text-[26px]" style={{ fontFamily: 'var(--spm-font-display)' }}>플랜 선택과 결제</h1>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] gap-5 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_370px]">
        <section className="space-y-5">
          <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.08), rgba(255,255,255,0.04))', border: '1px solid rgba(99,102,241,0.28)' }}>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--spm-t2)' }}>
              <Sparkles size={13} />
              수업 준비는 쉽게, 수업은 더 몰입감 있게
            </span>
            <h2 className="mt-5 max-w-[760px] text-[31px] font-black leading-[1.08] sm:text-[44px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
              결제 전에, SPOKEDU MASTER가 매 수업에서 해줄 일을 확인하세요.
            </h2>
            <p className="mt-4 max-w-[690px] text-[14px] font-semibold leading-7 sm:text-[15px]" style={{ color: 'var(--spm-t2)' }}>
              이 결제는 자료 몇 개를 여는 비용이 아니라, 30일 동안 수업을 고르고 SPOMOVE로 실행하고 설명 문구로 수업의 가치를 남기는 이용권입니다.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {OUTCOME_STATS.map((item) => (
                <div key={item.label} className="rounded-[16px] px-4 py-3" style={{ background: 'rgba(255,255,255,0.52)', border: '1px solid rgba(255,255,255,0.62)' }}>
                  <p className="text-[11px] font-black" style={{ color: 'var(--spm-t3)' }}>{item.label}</p>
                  <p className="mt-1 text-[24px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{item.value}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t2)' }}>{item.caption}</p>
                </div>
              ))}
            </div>
          </div>

          <PlanSelector selected={planKey} onSelect={setPlanKey} />

          <section className="grid gap-3 md:grid-cols-3">
            {VALUE_CARDS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <Icon size={18} color="var(--spm-acc)" />
                  <p className="mt-3 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{item.title}</p>
                  <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{item.body}</p>
                </div>
              );
            })}
          </section>

          <section className="rounded-[18px] p-5" style={{ background: plan.accent, border: `1px solid ${plan.border}` }}>
            <p className="text-[11px] font-black" style={{ color: plan.badgeColor }}>{plan.badge}</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{plan.title}</h3>
                <p className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>{plan.primaryFor}</p>
              </div>
              <p className="text-[28px] font-black" style={{ color: 'var(--spm-t)' }}>
                {plan.price}원<span className="ml-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>/{plan.period}</span>
              </p>
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {plan.includes.map((item) => (
                <li key={item} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                  <CheckCircle2 size={14} color="var(--spm-grn)" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>결제 후 바로 하는 일</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ['1', '이번 주 수업 확인', '홈에서 대표 수업과 주간 4선을 확인합니다.'],
                ['2', '큰 화면 실행', 'SPOMOVE를 TV나 빔에 띄워 바로 움직입니다.'],
                ['3', '설명 문구 복사', '수업 후 학부모·기관 안내 문구를 남깁니다.'],
              ].map(([step, title, body]) => (
                <div key={step} className="rounded-[15px] p-4" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                  <span className="grid h-8 w-8 place-items-center rounded-[10px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>{step}</span>
                  <p className="mt-3 text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{title}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{body}</p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>결제 요약</p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between gap-4 text-[13px] font-semibold">
                <span style={{ color: 'var(--spm-t3)' }}>상품</span>
                <span className="text-right" style={{ color: 'var(--spm-t)' }}>{orderSummary.name}</span>
              </div>
              <div className="flex justify-between gap-4 text-[13px] font-semibold">
                <span style={{ color: 'var(--spm-t3)' }}>대상</span>
                <span className="max-w-[210px] text-right" style={{ color: 'var(--spm-t)' }}>{orderSummary.target}</span>
              </div>
              <div className="h-px" style={{ background: 'var(--spm-br2)' }} />
              <div className="flex justify-between gap-4">
                <span className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>오늘 결제</span>
                <span className="text-[22px] font-black" style={{ color: 'var(--spm-t)' }}>{orderSummary.price}</span>
              </div>
            </div>
          </section>

          {checkingSession || subscriptionGuard === 'checking' ? (
            <section className="flex h-40 items-center justify-center rounded-[20px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <Loader2 size={22} className="animate-spin" color="var(--spm-t3)" />
            </section>
          ) : !isAuthed ? (
            <section className="space-y-3 rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <div>
                <p className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>이메일로 계속하기</p>
                <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
                  결제 확인과 이용권 관리를 위해 이메일 인증이 필요합니다.
                </p>
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
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={15} />}
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
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="w-full py-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                    다른 이메일로 다시 시도
                  </button>
                </>
              )}
              {error ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
            </section>
          ) : (
            <section className="space-y-3 rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} color="var(--spm-grn)" />
                <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{email}</p>
              </div>
              <button type="button" onClick={() => void startTossPayment()} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-[13px] py-4 text-[15px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)', boxShadow: '0 10px 28px rgba(99,102,241,0.32)' }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                카드로 {plan.price}원 결제
              </button>
              {error ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
            </section>
          )}

          <section className="rounded-[20px] p-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <Shield size={18} color="var(--spm-grn)" />
            <p className="mt-3 text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>결제 전 확인</p>
            <ul className="mt-3 space-y-2">
              {[
                '토스페이먼츠 보안 결제로 진행됩니다.',
                '이용 기간 중 플랜 변경이나 결제 관련 문의를 남길 수 있습니다.',
                '디지털 콘텐츠 이용 시작 후 환불은 이용 내역에 따라 제한될 수 있습니다.',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                  <CheckCircle2 size={13} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <p className="text-center text-[11px]" style={{ color: 'var(--spm-t3)' }}>
            <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-t3)' }}>이용약관</Link>
            <span className="mx-2">·</span>
            <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-t3)' }}>개인정보처리방침</Link>
            <span className="mx-2">·</span>
            <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>문의하기</a>
          </p>
        </aside>
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
