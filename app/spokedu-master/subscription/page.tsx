'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  CreditCard,
  Loader2,
  Mail,
  MonitorPlay,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MASTER_PRODUCT_CATALOG } from '../lib/productCatalog';

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
  lite: MASTER_PRODUCT_CATALOG.lite.priceLabel,
  pro: MASTER_PRODUCT_CATALOG.pro.priceLabel,
  team: MASTER_PRODUCT_CATALOG.center.priceLabel,
  school: MASTER_PRODUCT_CATALOG.school.priceLabel,
};

const PLAN_SUMMARY: Record<PlanKey, string> = {
  lite: '개인 선생님이 놀이체육 라이브러리와 SPOMOVE를 가볍게 시작하는 플랜',
  pro: '수업 준비, SPOMOVE 실행, 안내 문구까지 한 번에 쓰는 표준 플랜',
  team: '여러 수업을 운영하는 센터·기관 운영자를 위한 30일 이용권',
  school: '학교, 기관, 대형 센터를 위한 맞춤형 체육 수업 패키지',
};

const TRUST_POINTS = [
  '이용권 및 결제 관련 요청은 담당자가 확인한 뒤 처리합니다.',
  '30일 이용권은 자동 갱신되지 않으며, 계속 이용하려면 다시 결제해야 합니다.',
  '환불 가능 여부는 관련 법령, 회사 정책, 이용 내역에 따라 안내됩니다.',
];

const UNLOCK_ITEMS = [
  { icon: BookOpen, title: '놀이체육', value: '수업 자료', caption: '영상, 준비물, 진행법 확인' },
  { icon: MonitorPlay, title: '스포무브', value: '큰 화면', caption: 'TV와 빔에서 바로 실행' },
  { icon: Clipboard, title: '학부모안내', value: '문구', caption: '수업 후 안내문 작성' },
  { icon: Calendar, title: '운영 흐름', value: '연결', caption: '준비부터 기록까지 관리' },
] as const;

function statusLabel(status?: string) {
  if (status === 'active') return '이용권 활성';
  if (status === 'expired') return '이용권 만료';
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

function planChangeMailto(currentPlan: string | undefined, nextPlan: PlanKey) {
  const subject = encodeURIComponent('SPOKEDU MASTER 플랜 변경 문의');
  const body = encodeURIComponent(`현재 플랜: ${PLAN_LABELS[currentPlan ?? 'free'] ?? 'Trial'} / 변경 희망 플랜: ${PLAN_LABELS[nextPlan]}`);
  return `mailto:support@spokedu.com?subject=${subject}&body=${body}`;
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changeRequestPlan, setChangeRequestPlan] = useState<PlanKey | null>(null);

  useEffect(() => {
    void fetch('/api/spokedu-master/subscription')
      .then((res) => res.json())
      .then((data) => setSub(data as SubData))
      .catch(() => setError('이용권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setLoading(false));
  }, []);

  const isPaid = sub?.status === 'active';
  const isExpired = sub?.status === 'expired';
  const planLabel = PLAN_LABELS[sub?.plan ?? 'free'] ?? '체험/무료';
  const currentPlanKey = (sub?.plan === 'team' || sub?.plan === 'school' || sub?.plan === 'lite' ? sub.plan : 'pro') as PlanKey;
  const periodEndDate = formatDate(sub?.periodEnd);
  const recommendedPlan: PlanKey = 'pro';
  const paymentPlan: PlanKey = 'pro';
  const changeRequestHref = changeRequestPlan ? planChangeMailto(sub?.plan, changeRequestPlan) : '';

  const heroCopy = useMemo(() => {
    if (isPaid) {
      return {
        eyebrow: '30일 이용권이 정상 적용 중입니다',
        title: `${planLabel} 플랜으로 수업 운영 흐름을 유지하고 있어요`,
        body: '놀이체육, SPOMOVE, 안내문 기능이 하나의 수업 운영 루프로 이어집니다.',
      };
    }

    if (isExpired) {
      return {
        eyebrow: '이용권 만료',
        title: `${planLabel === '체험/무료' ? '30일' : planLabel} 이용권의 이용 기간이 종료되었습니다`,
        body: '30일 이용권을 다시 결제하면 수업 자료, SPOMOVE, 수업 설명 도구를 다시 사용할 수 있습니다.',
      };
    }

    return {
      eyebrow: '30일 이용권을 결제하면 바로 열립니다',
      title: '수업 준비는 놀이체육에서, 몰입은 SPOMOVE에서 시작하세요',
      body: '단순 자료 모음이 아니라 체육 수업을 고르고, 실행하고, 안내하는 30일 이용권 기반 수업 운영 환경을 제공합니다.',
    };
  }, [isExpired, isPaid, planLabel]);

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
            이용권 확인
          </h1>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] gap-5 px-5 pb-28 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-16">
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

                <div className="mt-7 grid gap-3 sm:grid-cols-4">
                  {UNLOCK_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-[16px] p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <Icon size={18} color="var(--spm-acc)" />
                          <span className="text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{item.value}</span>
                        </div>
                        <p className="mt-3 text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{item.title}</p>
                        <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{item.caption}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link href={isPaid || sub?.plan === 'team' ? '#' : `/spokedu-master/payment?plan=${paymentPlan}`} onClick={(event) => {
                    if (sub?.plan === 'team') {
                      event.preventDefault();
                      setChangeRequestPlan('team');
                      return;
                    }
                    if (!isPaid) return;
                    event.preventDefault();
                    setChangeRequestPlan(recommendedPlan);
                  }} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[13px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 10px 28px rgba(99,102,241,0.28)' }}>
                    {isPaid ? '플랜 변경 문의' : isExpired ? '30일 이용권 다시 결제하기' : 'Pro로 수업 열기'}
                    <ChevronRight size={16} />
                  </Link>
                  <Link href="/spokedu-master/dashboard" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[13px] text-[14px] font-black" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'var(--spm-t)' }}>
                    홈으로 돌아가기
                  </Link>
                </div>
              </div>

              <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>Current Plan</p>
                    <h3 className="mt-2 text-[27px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>{planLabel}</h3>
                  </div>
                  <div className="rounded-[14px] px-4 py-3 text-right" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                    <p className="text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>30일 이용료</p>
                    <p className="mt-1 text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>
                      {isPaid || isExpired ? PLAN_PRICES[currentPlanKey] : '이용권 없음'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[15px] p-4" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                    <Calendar size={16} color="var(--spm-t3)" />
                    <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이용 만료일</p>
                    <p className="mt-1 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>{periodEndDate ?? '결제 후 표시됩니다'}</p>
                  </div>
                  <div className="rounded-[15px] p-4" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                    <Shield size={16} color="var(--spm-grn)" />
                    <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>결제 관리</p>
                    <p className="mt-1 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>문의 기반 안전 처리</p>
                  </div>
                </div>

                {error ? <p className="mt-4 text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
              </section>

              {changeRequestPlan ? (
                <div className="rounded-[16px] p-4" style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.24)' }}>
                  <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>플랜 변경 문의가 필요합니다</p>
                  <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                    활성 이용권의 플랜 변경은 중복 결제를 방지하기 위해 담당자 확인 후 처리됩니다. 현재 플랜: {PLAN_LABELS[sub?.plan ?? 'free'] ?? 'Trial'} / 변경 희망 플랜: {PLAN_LABELS[changeRequestPlan]}
                  </p>
                  <a href={changeRequestHref} className="mt-3 inline-flex h-10 items-center justify-center rounded-[12px] px-4 text-[13px] font-black" style={{ background: 'var(--spm-acc)', color: '#fff' }}>
                    변경 문의 메일 보내기
                  </a>
                </div>
              ) : null}

              <section className="grid gap-3 md:grid-cols-2">
                {(['pro', 'team'] as PlanKey[]).map((plan) => {
                  const isCurrent = sub?.plan === plan && isPaid;
                  const isChangeRequest = isPaid && !isCurrent;
                  const ctaHref = isCurrent
                    ? '/spokedu-master/library'
                    : plan === 'team'
                      ? 'mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20Center%20%EB%8F%84%EC%9E%85%20%EC%83%81%EB%8B%B4'
                      : isChangeRequest
                        ? '#'
                        : `/spokedu-master/payment?plan=${plan}`;
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
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {[
                          plan === 'team' ? '기관·센터용' : '개인 계정',
                          'SPOMOVE',
                          '안내 문구',
                        ].map((item) => (
                          <span key={item} className="rounded-[10px] px-2 py-2 text-center text-[11px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                            {item}
                          </span>
                        ))}
                      </div>
                      <Link
                        href={ctaHref}
                        onClick={(event) => {
                          if (plan === 'team') return;
                          if (!isChangeRequest) return;
                          event.preventDefault();
                          setChangeRequestPlan(plan);
                        }}
                        className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-black"
                        style={{ background: isCurrent || isChangeRequest ? 'var(--spm-s3)' : 'var(--spm-acc)', border: isChangeRequest ? '1px solid var(--spm-br2)' : undefined, color: isCurrent || isChangeRequest ? 'var(--spm-t)' : '#fff' }}
                      >
                        {isCurrent ? '놀이체육으로 이동' : isChangeRequest ? '플랜 변경 문의' : '플랜 선택'}
                        <ChevronRight size={15} />
                      </Link>
                    </div>
                  );
                })}
              </section>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>이용권 관련 문의</p>
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
                    href="mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20이용권%20및%20환불%20문의"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black"
                    style={{ background: 'transparent', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
                  >
                    <Mail size={15} />
                    이용권·환불 문의
                  </a>
                </div>
                <p className="mt-3 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
                  결제와 이용권 관련 문의는 메일로 요청을 남기면 확인 후 안내합니다.
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
                <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>센터·기관 도입 상담</p>
                <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                  추가 강사 계정, 학교 라이선스, 기관 견적은 별도 상담으로 안내합니다.
                </p>
                <a
                  href="mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20기관%20도입%20상담"
                  className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black"
                  style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
                >
                  <Users size={15} />
                  도입 상담 요청
                </a>
              </section>

              <section className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>사업자 정보</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  {[
                    ['상호', '스포키듀'],
                    ['대표자', '최승환'],
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
          href="/spokedu-master/spomove"
          className="fixed bottom-5 right-5 hidden h-12 items-center gap-2 rounded-full px-5 text-[13px] font-black text-white shadow-[0_18px_40px_rgba(99,102,241,0.32)] md:flex"
          style={{ background: 'var(--spm-acc)' }}
        >
          <Zap size={16} />
          SPOMOVE 보기
        </Link>
      </main>
    </div>
  );
}
