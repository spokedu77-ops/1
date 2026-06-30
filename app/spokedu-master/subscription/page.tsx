'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Mail, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  MASTER_PRODUCT_CATALOG,
  buildMasterSupportMailto,
  getDirectPurchaseMasterProducts,
  type MasterProductCatalogItem,
} from '../lib/productCatalog';

type SubscriptionData = {
  plan: string;
  status: string;
  periodEnd: string | null;
  isAdmin?: boolean;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '확인 필요';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '확인 필요';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function productForPlan(plan: string | undefined, isAdmin?: boolean) {
  if (isAdmin || plan === 'team') return MASTER_PRODUCT_CATALOG.center;
  if (plan === 'lite') return MASTER_PRODUCT_CATALOG.lite;
  if (plan === 'premium' || plan === 'pro') return MASTER_PRODUCT_CATALOG.premium;
  return null;
}

function priceLabel(product: MasterProductCatalogItem) {
  return product.monthlyPriceKrw == null ? product.priceLabel : `월 ${product.monthlyPriceKrw.toLocaleString('ko-KR')}원`;
}

function PlanSummaryCard({
  product,
  current,
  activePaid,
}: {
  product: MasterProductCatalogItem;
  current: boolean;
  activePaid: boolean;
}) {
  const isCenter = product.id === 'center';
  const href = isCenter
    ? buildMasterSupportMailto('SPOKEDU MASTER 센터·기관 문의')
    : activePaid
      ? '/spokedu-master/subscription'
      : `/spokedu-master/payment?plan=${product.id}`;

  return (
    <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: current ? '1px solid rgba(16,185,129,0.46)' : '1px solid var(--spm-br2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black" style={{ color: current ? 'var(--spm-grn)' : 'var(--spm-t3)' }}>
            {current ? '현재 이용권' : product.billingCycleLabel}
          </p>
          <h2 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{product.displayName}</h2>
        </div>
        <span className="text-right text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>{priceLabel(product)}</span>
      </div>
      <ul className="mt-4 space-y-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
        {product.id === 'lite' ? (
          <>
            <li>라이브러리·수업 도구·기록·안내문 사용</li>
            <li>SPOMOVE 제외</li>
          </>
        ) : product.id === 'premium' ? (
          <>
            <li>전체 기능과 SPOMOVE 포함</li>
            <li>SPOMAT 회원가 15,900원</li>
          </>
        ) : (
          <>
            <li>별도 문의</li>
            <li>직접 결제 없음</li>
          </>
        )}
      </ul>
      <Link
        href={href}
        onClick={(event) => {
          if (activePaid && !current && !isCenter) event.preventDefault();
        }}
        className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-black"
        style={{
          background: current || activePaid && !isCenter ? 'var(--spm-s3)' : 'var(--spm-acc)',
          border: current || activePaid && !isCenter ? '1px solid var(--spm-br2)' : undefined,
          color: current || activePaid && !isCenter ? 'var(--spm-t)' : '#fff',
        }}
      >
        {current
          ? '사용 중'
          : isCenter
            ? '문의하기'
            : activePaid
              ? '변경은 다음 단계'
              : '선택하고 결제수단 등록'}
        <ChevronRight size={15} />
      </Link>
    </section>
  );
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/spokedu-master/subscription', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setSubscription(data as SubscriptionData))
      .catch(() => setError('이용권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setLoading(false));
  }, []);

  const currentProduct = productForPlan(subscription?.plan, subscription?.isAdmin);
  const activePaid = subscription?.status === 'active' && Boolean(currentProduct);

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="mx-auto flex w-full max-w-[1120px] items-center gap-3 px-5 pb-4 pt-5 sm:px-8">
        <Link href="/spokedu-master/profile" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="이전 화면">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>이용권 상태</h1>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] gap-5 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {loading ? (
          <section className="flex h-60 items-center justify-center rounded-[20px] lg:col-span-2" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <Loader2 size={22} className="animate-spin" color="var(--spm-t3)" />
          </section>
        ) : (
          <>
            <section className="space-y-5">
              <section className="rounded-[22px] p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.08))', border: '1px solid rgba(99,102,241,0.26)' }}>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: activePaid ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)', color: activePaid ? 'var(--spm-grn)' : 'var(--spm-yel)' }}>
                  <CheckCircle2 size={13} />
                  {activePaid ? '이용 중' : '미구독'}
                </span>
                <h2 className="mt-5 text-[32px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)' }}>
                  {activePaid && currentProduct ? `${currentProduct.displayName} 사용 중` : '라이트 또는 프리미엄을 선택하세요'}
                </h2>
                <p className="mt-3 text-[14px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
                  {activePaid
                    ? '활성 이용권이 있는 동안 같은 상품을 다시 결제할 수 없습니다. 프리미엄 변경과 해지는 다음 단계에서 분리합니다.'
                    : '무료 체험 없이 월 자동결제로 시작합니다. 첫 결제가 성공한 경우에만 이용권이 활성화됩니다.'}
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[14px] p-3" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <dt className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>Plan</dt>
                    <dd className="mt-1 text-[16px] font-black">{currentProduct?.displayName ?? '없음'}</dd>
                  </div>
                  <div className="rounded-[14px] p-3" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <dt className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>Status</dt>
                    <dd className="mt-1 text-[16px] font-black">{subscription?.status ?? 'none'}</dd>
                  </div>
                  <div className="rounded-[14px] p-3" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <dt className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>Until</dt>
                    <dd className="mt-1 text-[16px] font-black">{formatDate(subscription?.periodEnd)}</dd>
                  </div>
                </dl>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                {getDirectPurchaseMasterProducts().map((product) => (
                  <PlanSummaryCard
                    key={product.id}
                    product={product}
                    current={currentProduct?.id === product.id && activePaid}
                    activePaid={activePaid}
                  />
                ))}
                <PlanSummaryCard
                  product={MASTER_PRODUCT_CATALOG.center}
                  current={currentProduct?.id === 'center' && activePaid}
                  activePaid={activePaid}
                />
              </section>
              {error ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-red)' }}>{error}</p> : null}
            </section>

            <aside className="space-y-4">
              <section className="rounded-[20px] p-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <Shield size={18} color="var(--spm-grn)" />
                <h2 className="mt-3 text-[15px] font-black">자동결제 기준</h2>
                <ul className="mt-3 space-y-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                  <li>월 자동결제 상품</li>
                  <li>매월 최초 결제일에 자동 결제</li>
                  <li>언제든 해지 가능</li>
                  <li>해지 후 결제된 이용 기간까지 사용 가능</li>
                  <li>무료 체험 없음</li>
                </ul>
              </section>
              <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <Mail size={18} color="var(--spm-acc)" />
                <h2 className="mt-3 text-[15px] font-black">센터·기관 문의</h2>
                <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                  센터·기관은 직접 결제를 제공하지 않습니다.
                </p>
                <a href={buildMasterSupportMailto('SPOKEDU MASTER 센터·기관 문의')} className="mt-4 flex h-11 items-center justify-center rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
                  문의하기
                </a>
              </section>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
