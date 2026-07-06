'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import {
  getSubscriptionDisplaySummary,
  normalizeSubscriptionSummary,
  type SubscriptionDisplaySummary,
  type SubscriptionSummaryData,
} from '../profile/subscriptionSummary';

const NON_BILLING_CANCEL_MESSAGE = '자동결제 해지 대상이 아닙니다. 고객센터로 문의해 주세요.';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-t py-3 first:border-t-0" style={{ borderColor: 'var(--spm-br2)' }}>
      <dt className="text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>{label}</dt>
      <dd className="text-right text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{value}</dd>
    </div>
  );
}

function SubscriptionStatusCard({
  display,
  onCancel,
}: {
  display: SubscriptionDisplaySummary;
  onCancel: () => void;
}) {
  return (
    <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>현재 이용권</p>
          <h2 className="mt-1 text-[28px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
            {display.planLabel}
          </h2>
        </div>
        <span className="rounded-full px-3 py-1 text-[11px] font-black" style={{ background: display.state === 'active' ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)', color: display.state === 'active' ? 'var(--spm-grn)' : 'var(--spm-yel)' }}>
          {display.statusLabel}
        </span>
      </div>

      <dl className="mt-5">
        <DetailRow label="이용 상태" value={display.statusLabel} />
        {display.amountText ? <DetailRow label="월 결제 금액" value={display.amountText} /> : null}
        {display.dateLabel && display.dateText ? <DetailRow label={display.dateLabel} value={display.dateText} /> : null}
      </dl>

      <p className="mt-4 rounded-[14px] p-3 text-[13px] font-semibold leading-6" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
        {display.description}
      </p>

      {display.canUseSpomatMemberPrice ? (
        <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
          SPOMAT 회원가 구매 대상
        </p>
      ) : null}

      {display.canCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-5 flex h-11 items-center justify-center rounded-[12px] px-5 text-[13px] font-black"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: 'var(--spm-red)' }}
        >
          구독 해지
        </button>
      ) : null}

      {display.canUpgradeToPremium && display.upgradeHref && display.upgradeLabel ? (
        <Link
          href={display.upgradeHref}
          className="mt-5 flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white"
          style={{ background: 'var(--spm-acc)' }}
        >
          {display.upgradeLabel}
        </Link>
      ) : null}

      {display.primaryHref === '/spokedu-master/payment' && display.primaryLabel ? (
        <Link
          href="/spokedu-master/payment"
          className="mt-5 flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white"
          style={{ background: 'var(--spm-acc)' }}
        >
          {display.primaryLabel}
        </Link>
      ) : null}
    </section>
  );
}

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionSummaryData | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const loadSubscription = useCallback(async () => {
    setLoadStatus('loading');
    try {
      const res = await fetch('/api/spokedu-master/subscription', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      setData(normalizeSubscriptionSummary(json));
      setLoadStatus('ready');
    } catch {
      setData(null);
      setLoadStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const display = getSubscriptionDisplaySummary(data);
  const cancelEndDate = display.dateLabel === '이용 종료일' ? display.dateText : getSubscriptionDisplaySummary({
    ...(data ?? normalizeSubscriptionSummary(null)),
    cancelAtPeriodEnd: true,
  }).dateText;

  const handleCancelConfirm = async () => {
    if (cancelling) return;
    if (!display.canCancel) {
      setCancelError(NON_BILLING_CANCEL_MESSAGE);
      return;
    }

    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch('/api/spokedu-master/payment/billing/cancel', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? '구독 해지를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
      setConfirmOpen(false);
      await loadSubscription();
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : '구독 해지를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="mx-auto flex w-full max-w-[880px] items-center gap-3 px-5 pb-4 pt-5 sm:px-8">
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

      <main className="mx-auto w-full max-w-[880px] px-5 pb-16 sm:px-8">
        {loadStatus === 'loading' ? (
          <section className="flex h-60 items-center justify-center rounded-[20px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <Loader2 size={22} className="animate-spin" color="var(--spm-t3)" />
          </section>
        ) : loadStatus === 'error' ? (
          <section className="rounded-[20px] p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
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
          <SubscriptionStatusCard display={display} onCancel={() => setConfirmOpen(true)} />
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
            해지 후에도 <strong>{cancelEndDate ?? '현재 이용 기간 종료일'}</strong>까지 이용할 수 있으며<br />
            다음 결제일부터는 자동결제되지 않습니다.
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
