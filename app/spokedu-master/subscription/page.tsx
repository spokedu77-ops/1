'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, Shield } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  MASTER_PRODUCT_CATALOG,
  buildMasterSupportMailto,
  getDirectPurchaseMasterProducts,
} from '../lib/productCatalog';
import { BottomSheet } from '../components/ui/BottomSheet';
import { formatSubscriptionEndDate } from '../profile/subscriptionSummary';

type SubscriptionData = {
  plan: string;
  status: string;
  periodEnd: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  cancelAtPeriodEnd: boolean;
  isAdmin: boolean;
};

function getProductForPlan(plan: string) {
  return getDirectPurchaseMasterProducts().find((p) => p.serverPlanKey === plan) ?? null;
}

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const loadSubscription = useCallback(async () => {
    setLoadStatus('loading');
    try {
      const res = await fetch('/api/spokedu-master/subscription', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      setData(await res.json() as SubscriptionData);
      setLoadStatus('ready');
    } catch {
      setLoadStatus('error');
    }
  }, []);

  useEffect(() => { void loadSubscription(); }, [loadSubscription]);

  const handleCancelConfirm = async () => {
    if (cancelling) return;
    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch('/api/spokedu-master/payment/billing/cancel', { method: 'POST' });
      if (!res.ok) throw new Error('cancel failed');
      setConfirmOpen(false);
      await loadSubscription();
    } catch {
      setCancelError('구독 해지를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCancelling(false);
    }
  };

  const isCenter = data?.isAdmin === true || data?.plan === 'team';
  const activePaid = data?.status === 'active' && (data?.plan === 'lite' || data?.plan === 'premium');
  const isCancelling = activePaid && data?.cancelAtPeriodEnd === true;
  const isActiveNotCancelling = activePaid && !isCancelling;
  const isExpired = !activePaid && (data?.plan === 'lite' || data?.plan === 'premium') && !!data && data?.status !== 'none';
  const isUnsubscribed = !data || (data?.status === 'none' && !isCenter);

  const product = data ? getProductForPlan(data.plan) : null;
  const displayName = product?.displayName.replace('SPOKEDU MASTER ', '') ?? null;
  const priceLabel = product?.monthlyPriceKrw != null ? `월 ${product.monthlyPriceKrw.toLocaleString('ko-KR')}원` : null;

  const endDate = formatSubscriptionEndDate(data?.currentPeriodEnd ?? data?.periodEnd ?? null);
  const nextBillingDate = formatSubscriptionEndDate(data?.nextBillingAt ?? null);

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="mx-auto flex w-full max-w-[1120px] items-center gap-3 px-5 pb-4 pt-5 sm:px-8">
        <Link
          href="/spokedu-master/profile"
          className="grid h-10 w-10 place-items-center rounded-[10px]"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
          aria-label="이전 화면"
        >
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>구독 관리</h1>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] gap-5 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {loadStatus === 'loading' ? (
          <section className="flex h-60 items-center justify-center rounded-[20px] lg:col-span-2" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <Loader2 size={22} className="animate-spin" color="var(--spm-t3)" />
          </section>
        ) : loadStatus === 'error' ? (
          <section className="rounded-[20px] p-6 lg:col-span-2" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--spm-t2)' }}>이용권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => void loadSubscription()}
              className="mt-4 flex h-11 items-center justify-center rounded-[12px] px-5 text-[13px] font-black text-white"
              style={{ background: 'var(--spm-acc)' }}
            >
              다시 시도
            </button>
          </section>
        ) : (
          <>
            <section className="space-y-5">
              {/* 센터·기관 또는 관리자 */}
              {isCenter ? (
                <section className="rounded-[22px] p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.08))', border: '1px solid rgba(99,102,241,0.26)' }}>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--spm-grn)' }}>
                    이용 중
                  </span>
                  <h2 className="mt-4 text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
                    {MASTER_PRODUCT_CATALOG.center.displayName.replace('SPOKEDU MASTER ', '')}
                  </h2>
                  <p className="mt-2 text-[13px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                    직접 결제 없음. 센터·기관 권한은 관리자가 별도로 부여합니다.
                  </p>
                </section>
              ) : isUnsubscribed ? (
                /* 미구독 */
                <section className="rounded-[22px] p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--spm-t2)' }}>현재 이용 중인 구독이 없습니다.</p>
                  <Link
                    href="/spokedu-master/payment"
                    className="mt-4 flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white"
                    style={{ background: 'var(--spm-acc)' }}
                  >
                    이용권 선택
                  </Link>
                </section>
              ) : isActiveNotCancelling ? (
                /* 라이트 또는 프리미엄 활성 */
                <section className="rounded-[22px] p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.08))', border: '1px solid rgba(99,102,241,0.26)' }}>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--spm-grn)' }}>
                    구독 중
                  </span>
                  <h2 className="mt-4 text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
                    {displayName}
                  </h2>
                  <p className="mt-1 text-[18px] font-black" style={{ color: 'var(--spm-t2)' }}>{priceLabel}</p>
                  <dl className="mt-5 space-y-2 text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                    <div className="flex gap-2">
                      <dt>현재 이용권</dt>
                      <dd className="font-black" style={{ color: 'var(--spm-t)' }}>{displayName}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt>다음 결제 예정일</dt>
                      <dd className="font-black" style={{ color: 'var(--spm-t)' }}>{nextBillingDate}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                    이용권 변경은 다음 단계에서 제공됩니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="mt-5 flex h-11 items-center justify-center rounded-[12px] px-5 text-[13px] font-black"
                    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: 'var(--spm-red)' }}
                  >
                    구독 해지
                  </button>
                </section>
              ) : isCancelling ? (
                /* 해지 예정 */
                <section className="rounded-[22px] p-6" style={{ background: 'var(--spm-s2)', border: '1px solid rgba(245,158,11,0.35)' }}>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-yel)' }}>
                    해지 예정
                  </span>
                  <h2 className="mt-4 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
                    {displayName}
                  </h2>
                  <dl className="mt-4 space-y-2 text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                    <div className="flex gap-2">
                      <dt>이용 종료일</dt>
                      <dd className="font-black" style={{ color: 'var(--spm-t)' }}>{endDate}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-[13px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                    해당 날짜까지 이용할 수 있으며 이후 자동결제되지 않습니다.
                  </p>
                </section>
              ) : isExpired ? (
                /* 만료 */
                <section className="rounded-[22px] p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>
                    이용 종료
                  </span>
                  <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--spm-t2)' }}>구독이 종료되었습니다.</p>
                  <Link
                    href="/spokedu-master/payment"
                    className="mt-4 flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white"
                    style={{ background: 'var(--spm-acc)' }}
                  >
                    이용권 다시 선택
                  </Link>
                </section>
              ) : null}
            </section>

            <aside className="space-y-4">
              <section className="rounded-[20px] p-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <Shield size={18} color="var(--spm-grn)" />
                <h2 className="mt-3 text-[15px] font-black">월 자동결제</h2>
                <ul className="mt-3 space-y-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                  <li>매월 최초 결제일에 자동결제됩니다.</li>
                  <li>구독을 해지해도 현재 결제 기간 종료일까지 이용할 수 있습니다.</li>
                  <li>무료 체험 없음</li>
                </ul>
              </section>

              <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <Mail size={18} color="var(--spm-acc)" />
                <h2 className="mt-3 text-[15px] font-black">센터·기관 문의</h2>
                <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                  {MASTER_PRODUCT_CATALOG.center.durationLabel}. 센터·기관은 별도 문의로 진행합니다.
                </p>
                <a
                  href={buildMasterSupportMailto('SPOKEDU MASTER 센터·기관 문의')}
                  className="mt-4 flex h-11 items-center justify-center rounded-[12px] text-[13px] font-black"
                  style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
                >
                  문의하기
                </a>
              </section>
            </aside>
          </>
        )}
      </main>

      <BottomSheet
        open={confirmOpen}
        title="구독 해지"
        onClose={() => { if (!cancelling) setConfirmOpen(false); }}
      >
        <div className="space-y-4">
          <p className="text-[15px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>
            구독을 해지하시겠어요?
          </p>
          <p className="text-[13px] font-semibold leading-6" style={{ color: '#475569' }}>
            해지 후에도 <strong>{endDate}</strong>까지 이용할 수 있으며,<br />
            다음 결제일부터 자동결제되지 않습니다.
          </p>
          {cancelError ? (
            <p className="rounded-[10px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
              {cancelError}
            </p>
          ) : null}
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={cancelling}
              className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black disabled:opacity-50"
              style={{ background: '#f1f5f9', color: '#0f172a' }}
            >
              계속 이용하기
            </button>
            <button
              type="button"
              onClick={() => void handleCancelConfirm()}
              disabled={cancelling}
              className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', color: '#dc2626' }}
            >
              {cancelling ? '처리 중...' : '구독 해지'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
