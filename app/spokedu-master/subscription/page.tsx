'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  MonitorPlay,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type SubData = {
  plan: string;
  status: string;
  periodEnd: string | null;
};

type PlanKey = 'lite' | 'pro' | 'team' | 'school';

const PLAN_LABELS: Record<string, string> = {
  free: '체험/무료',
  lite: 'Lite',
  pro: 'Pro',
  team: 'Center',
  school: 'School',
};

const PLAN_PRICES: Record<PlanKey, string> = {
  lite: '19,900원/월',
  pro: '39,900원/월',
  team: '79,000원/월',
  school: '문의',
};

const PLAN_SUMMARY: Record<PlanKey, string> = {
  lite: '개인 강사가 라이브러리와 SPOMOVE를 가볍게 시작하는 플랜',
  pro: '수업 준비, SPOMOVE 실행, 설명 문구까지 모두 쓰는 표준 플랜',
  team: '강사 여러 명이 같은 수업 품질과 설명 자료를 공유하는 센터 플랜',
  school: '학교·기관용 라이선스와 참여형 체육수업 패키지',
};

const INCLUDED_VALUES = [
  {
    icon: BookOpen,
    title: '수업 라이브러리',
    body: '센터 커리큘럼 기반 프로그램을 구독자용 카드, 필터, 수업안으로 정리합니다.',
  },
  {
    icon: MonitorPlay,
    title: 'SPOMOVE 큰 화면',
    body: '빔, TV, 태블릿에서 바로 실행할 수 있는 반응훈련 화면을 제공합니다.',
  },
  {
    icon: FileText,
    title: '수업 설명 도구',
    body: '학부모·기관·학교에 체육수업의 의미를 설명할 문구를 빠르게 만듭니다.',
  },
];

const TRUST_POINTS = [
  '토스페이먼츠 기반 보안 결제를 사용합니다.',
  '다음 결제일 전까지 언제든 구독 취소를 요청할 수 있습니다.',
  '유료 콘텐츠 특성상 사용 시작 이후 환불은 이용 내역에 따라 제한될 수 있습니다.',
];

function statusLabel(status?: string) {
  if (status === 'active') return '활성 구독';
  if (status === 'expired') return '만료';
  if (status === 'cancelled') return '취소됨';
  return '체험/무료';
}

function formatDate(date: string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/spokedu-master/subscription')
      .then((res) => res.json())
      .then((data) => setSub(data as SubData))
      .catch(() => setError('구독 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setLoading(false));
  }, []);

  const isPaid = sub?.status === 'active';
  const planLabel = PLAN_LABELS[sub?.plan ?? 'free'] ?? '체험/무료';
  const currentPlanKey = (sub?.plan === 'team' || sub?.plan === 'school' || sub?.plan === 'lite' ? sub.plan : 'pro') as PlanKey;
  const periodEndDate = formatDate(sub?.periodEnd);
  const recommendedPlan: PlanKey = sub?.plan === 'pro' ? 'team' : 'pro';

  const heroCopy = useMemo(() => {
    if (isPaid) {
      return {
        eyebrow: '구독이 정상 적용 중입니다',
        title: `${planLabel} 플랜으로 수업 준비 흐름을 유지하고 있어요.`,
        body: '라이브러리, SPOMOVE, 설명 도구가 하나의 수업 루프로 이어지도록 계속 다듬고 있습니다.',
      };
    }

    return {
      eyebrow: '구독을 시작하면 바로 열립니다',
      title: '수업 준비는 라이브러리에서, 몰입은 SPOMOVE에서 시작하세요.',
      body: '무료 자료실이 아니라, 체육수업을 고르고 실행하고 설명하는 구독형 수업 운영 경험을 제공합니다.',
    };
  }, [isPaid, planLabel]);

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-5 pb-4 pt-5 sm:px-8">
        <Link
          href="/spokedu-master/profile"
          className="grid h-10 w-10 place-items-center rounded-[10px]"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
          aria-label="이전 화면"
        >
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>
            SPOKEDU MASTER
          </p>
          <h1 className="text-[21px] font-black leading-tight sm:text-[26px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            구독 관리
          </h1>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] gap-5 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {loading ? (
          <div className="flex h-60 items-center justify-center rounded-[18px] lg:col-span-2" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <Loader2 size={22} className="animate-spin" color="var(--spm-t3)" />
          </div>
        ) : (
          <>
            <section className="space-y-5">
              <div
                className="overflow-hidden rounded-[22px] p-6 sm:p-8"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.20), rgba(16,185,129,0.10), rgba(255,255,255,0.04))',
                  border: '1px solid rgba(99,102,241,0.30)',
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--spm-t2)' }}>
                    <Sparkles size={13} />
                    {heroCopy.eyebrow}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: isPaid ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)', color: isPaid ? 'var(--spm-grn)' : 'var(--spm-yel)' }}>
                    <CheckCircle2 size={13} />
                    {statusLabel(sub?.status)}
                  </span>
                </div>

                <h2 className="mt-5 max-w-[760px] text-[30px] font-black leading-[1.08] sm:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
                  {heroCopy.title}
                </h2>
                <p className="mt-4 max-w-[680px] text-[14px] font-semibold leading-7 sm:text-[15px]" style={{ color: 'var(--spm-t2)' }}>
                  {heroCopy.body}
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {INCLUDED_VALUES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-[16px] p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <Icon size={18} color="var(--spm-acc)" />
                        <p className="mt-3 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{item.title}</p>
                        <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{item.body}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>Current Plan</p>
                    <h3 className="mt-2 text-[27px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>{planLabel}</h3>
                  </div>
                  <div className="rounded-[14px] px-4 py-3 text-right" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                    <p className="text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>월 구독료</p>
                    <p className="mt-1 text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>
                      {isPaid ? PLAN_PRICES[currentPlanKey] : '미구독'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[15px] p-4" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                    <Calendar size={16} color="var(--spm-t3)" />
                    <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>다음 결제일</p>
                    <p className="mt-1 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>{periodEndDate ?? '구독 시작 후 표시됩니다'}</p>
                  </div>
                  <div className="rounded-[15px] p-4" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                    <Shield size={16} color="var(--spm-grn)" />
                    <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>결제 관리</p>
                    <p className="mt-1 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>문의 기반 안전 처리</p>
                  </div>
                </div>

                {error ? <p className="mt-4 text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                {(['pro', 'team'] as PlanKey[]).map((plan) => {
                  const isCurrent = sub?.plan === plan && isPaid;
                  return (
                    <div key={plan} className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: isCurrent ? '1px solid rgba(16,185,129,0.35)' : '1px solid var(--spm-br2)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black" style={{ color: isCurrent ? 'var(--spm-grn)' : 'var(--spm-t3)' }}>
                            {isCurrent ? '현재 사용 중' : plan === recommendedPlan ? '추천 플랜' : '확장 플랜'}
                          </p>
                          <h4 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>{PLAN_LABELS[plan]}</h4>
                        </div>
                        <p className="text-right text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>{PLAN_PRICES[plan]}</p>
                      </div>
                      <p className="mt-3 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{PLAN_SUMMARY[plan]}</p>
                      <Link
                        href={isCurrent ? '/spokedu-master/library' : `/spokedu-master/payment?plan=${plan}`}
                        className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-black"
                        style={{ background: isCurrent ? 'var(--spm-s3)' : 'var(--spm-acc)', color: isCurrent ? 'var(--spm-t)' : '#fff' }}
                      >
                        {isCurrent ? '라이브러리로 이동' : '플랜 선택'}
                        <ChevronRight size={15} />
                      </Link>
                    </div>
                  );
                })}
              </section>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>구독 관리 요청</p>
                <div className="mt-4 space-y-2">
                  <a
                    href="mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20결제수단%20변경%20문의"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black"
                    style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
                  >
                    <CreditCard size={15} />
                    결제 수단 변경
                  </a>
                  <a
                    href="mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20구독%20취소%20문의"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black"
                    style={{ background: 'transparent', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
                  >
                    <Mail size={15} />
                    구독 취소 문의
                  </a>
                </div>
                <p className="mt-3 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
                  운영 초기에는 결제 변경과 취소를 메일 기반으로 안전하게 처리합니다. 자동 포털은 결제 안정화 이후 연결합니다.
                </p>
              </section>

              <section className="rounded-[20px] p-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <Shield size={18} color="var(--spm-grn)" />
                <p className="mt-3 text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>결제와 환불 안내</p>
                <ul className="mt-3 space-y-2">
                  {TRUST_POINTS.map((point) => (
                    <li key={point} className="flex gap-2 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                      <CheckCircle2 size={13} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>센터·학교 도입 상담</p>
                <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                  강사 계정 여러 개, 학교 라이선스, 기관 견적은 별도 상담으로 안내합니다.
                </p>
                <a
                  href="mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20기관%20도입%20상담"
                  className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black"
                  style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
                >
                  <Users size={15} />
                  기관 상담 요청
                </a>
              </section>

              <section className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>사업자 정보</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  {[
                    ['상호', '스포키듀'],
                    ['대표자', '최진우'],
                    ['사업자등록번호', '311-63-00356'],
                    ['통신판매업', '신고 준비 중'],
                    ['고객센터', 'support@spokedu.com'],
                  ].map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="whitespace-nowrap text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</dt>
                      <dd className="text-[10px] font-medium" style={{ color: 'var(--spm-t2)' }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <p className="text-center text-[11px]" style={{ color: 'var(--spm-t3)' }}>
                <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-t3)' }}>이용약관</Link>
                <span className="mx-2">·</span>
                <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-t3)' }}>개인정보처리방침</Link>
                <span className="mx-2">·</span>
                <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>문의하기</a>
              </p>
            </aside>
          </>
        )}

        <Link
          href="/spokedu-master/spomove/session"
          className="fixed bottom-5 right-5 hidden h-12 items-center gap-2 rounded-full px-5 text-[13px] font-black text-white shadow-[0_18px_40px_rgba(99,102,241,0.32)] md:flex"
          style={{ background: 'var(--spm-acc)' }}
        >
          <Zap size={16} />
          큰 화면 실행
        </Link>
      </main>
    </div>
  );
}
