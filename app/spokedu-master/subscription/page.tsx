'use client';

import Link from 'next/link';
import { ArrowLeft, Calendar, CheckCircle2, CreditCard, Loader2, Mail, Shield, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

type SubData = {
  plan: string;
  status: string;
  periodEnd: string | null;
};

const PLAN_LABELS: Record<string, string> = { pro: 'Pro', team: 'Center' };
const PLAN_PRICES: Record<string, string> = { pro: '39,900원/월', team: '79,000원/월' };

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/spokedu-master/subscription')
      .then((res) => res.json())
      .then((data) => setSub(data as SubData))
      .catch(() => setError('구독 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const isPaid = sub?.status === 'active';
  const planLabel = PLAN_LABELS[sub?.plan ?? ''] ?? 'Trial';
  const planPrice = PLAN_PRICES[sub?.plan ?? ''];
  const periodEndDate = sub?.periodEnd
    ? new Date(sub.periodEnd).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="flex items-center gap-3 px-[22px] pb-5 pt-[22px] sm:px-8">
        <Link href="/spokedu-master/profile" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="뒤로">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[20px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>구독 관리</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] space-y-4 px-[22px] pb-14 sm:px-8">
        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-[16px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <Loader2 size={20} className="animate-spin" color="var(--spm-t3)" />
          </div>
        ) : (
          <>
            {/* Current plan card */}
            <section
              className="rounded-[18px] p-5"
              style={{
                background: isPaid
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.10), var(--spm-s2))'
                  : 'var(--spm-s2)',
                border: isPaid ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--spm-br2)',
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>현재 플랜</p>
              <div className="mt-3 flex items-end justify-between">
                <h2 className="text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{planLabel}</h2>
                {isPaid ? (
                  <span className="flex items-center gap-1.5 text-[12px] font-black" style={{ color: 'var(--spm-grn)' }}>
                    <CheckCircle2 size={13} />활성
                  </span>
                ) : (
                  <span className="text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>미구독</span>
                )}
              </div>
              {isPaid && (
                <div className="mt-4 space-y-2">
                  {planPrice ? (
                    <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                      <CreditCard size={13} color="var(--spm-t3)" />
                      {planPrice}
                    </div>
                  ) : null}
                  {periodEndDate ? (
                    <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                      <Calendar size={13} color="var(--spm-t3)" />
                      다음 결제일: {periodEndDate}
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            {/* Portal actions or upgrade CTA */}
            {isPaid ? (
              <section className="space-y-2 rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <p className="mb-3 text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>결제 관리</p>
                <a
                  href="mailto:support@spokedu.com?subject=결제%20수단%20변경%20요청"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black"
                  style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
                >
                  <CreditCard size={15} />
                  결제 수단 변경 문의
                </a>
                <a
                  href="mailto:support@spokedu.com?subject=구독%20취소%20요청"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-bold"
                  style={{ color: 'var(--spm-red)' }}
                >
                  <XCircle size={14} />
                  구독 취소 문의
                </a>
                <p className="text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>
                  <Mail size={11} className="mr-1 inline" />
                  support@spokedu.com으로 메일을 보내주시면 1영업일 내 처리됩니다.
                </p>
                {error ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
              </section>
            ) : (
              <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
                  현재 구독 중인 플랜이 없습니다. Pro 또는 Center 플랜을 시작하면 전체 기능을 이용할 수 있습니다.
                </p>
                <Link
                  href="/spokedu-master/payment?plan=pro"
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-black text-white"
                  style={{ background: 'var(--spm-acc)' }}
                >
                  플랜 시작하기
                </Link>
              </section>
            )}

            {/* Trust banner */}
            <div className="flex items-start gap-2 rounded-[14px] px-4 py-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
              <Shield size={14} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
              <p className="text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                토스페이먼츠 보안 결제 · 언제든지 취소 가능 · 다음 결제일 전 취소 시 요금 없음
              </p>
            </div>

            {/* 청약철회 및 환불 — 전자상거래법 필수 기재사항 */}
            <section className="rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-t3)' }}>청약철회 및 환불</p>
              <div className="space-y-2 text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t2)' }}>
                <p>· 서비스 이용 시작 전에는 전자상거래법에 따라 청약철회가 가능합니다.</p>
                <p>· 디지털 콘텐츠 특성상 이용 시작 후에는 청약철회가 제한될 수 있습니다.</p>
                <p>· 결제 후 7일 이내 미사용 시 전액 환불을 요청할 수 있습니다.</p>
                <p>· 환불 문의: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a></p>
              </div>
            </section>
          </>
        )}

        {/* Legal links */}
        <p className="text-center text-[11px]" style={{ color: 'var(--spm-t3)' }}>
          <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-t3)' }}>이용약관</Link>
          <span className="mx-2">·</span>
          <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-t3)' }}>개인정보처리방침</Link>
          <span className="mx-2">·</span>
          <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>문의하기</a>
        </p>

        {/* 사업자 정보 — 전자상거래법 필수 기재사항 */}
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
                <dt className="whitespace-nowrap text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</dt>
                <dd className="text-[10px] font-medium" style={{ color: 'var(--spm-t2)' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  );
}
