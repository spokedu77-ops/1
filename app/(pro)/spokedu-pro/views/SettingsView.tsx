'use client';

import { useState } from 'react';
import {
  Settings2, CheckCircle, Zap, Crown, Building2, RefreshCw, Sparkles,
  CreditCard, AlertTriangle, Clock, XCircle, CalendarX,
} from 'lucide-react';
import { useProContext, type Plan, type SubscriptionStatus } from '../hooks/useProContext';

// ── 플랜 정의 ───────────────────────────────────────────────────────────────
type PlanDef = {
  id: Plan;
  label: string;
  priceKrw: number;
  description: string;
  features: string[];
  badge?: string;
  badgeColor?: string;
  icon: React.ElementType;
};

const PLANS: PlanDef[] = [
  {
    id: 'free',
    label: 'Free',
    priceKrw: 0,
    description: '기본 기능을 무제한으로',
    features: ['로드맵 & 100대 프로그램 열람', '수업 보조도구 (팀 나누기, 술래 정하기)', '원생 등록 최대 10명'],
    icon: Building2,
  },
  {
    id: 'basic',
    label: 'Basic',
    priceKrw: 49900,
    description: '소규모 센터 최적화',
    features: ['Free 기능 전체 포함', '원생 등록 최대 50명', 'AI 에듀-에코 리포트 월 20회', '출결·신체 평가 CSV 내보내기'],
    badge: 'Popular',
    badgeColor: 'bg-blue-500',
    icon: Zap,
  },
  {
    id: 'pro',
    label: 'Pro',
    priceKrw: 79900,
    description: '성장하는 센터를 위한 풀 패키지',
    features: ['Basic 기능 전체 포함', '원생 무제한 등록', 'AI 리포트 무제한', '멀티 강사 계정 (최대 5명)', '우선 지원 채널'],
    badge: 'Best',
    badgeColor: 'bg-amber-500',
    icon: Crown,
  },
];

// ── 종료 예약 배너 ────────────────────────────────────────────────────────────
function CancelScheduledBanner({
  currentPeriodEndAt,
  onReactivate,
  reactivating,
}: {
  currentPeriodEndAt: string | null;
  onReactivate: () => void;
  reactivating: boolean;
}) {
  const endDate = currentPeriodEndAt ? new Date(currentPeriodEndAt) : null;
  return (
    <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
      <CalendarX className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-bold">구독 종료 예약됨</p>
        <p className="text-amber-400/80">
          {endDate
            ? `${endDate.toLocaleDateString('ko-KR')}에 구독이 종료됩니다. `
            : '현재 결제 기간이 끝나면 구독이 종료됩니다. '}
          지금 취소를 철회할 수 있습니다.
        </p>
      </div>
      <button
        type="button"
        disabled={reactivating}
        onClick={onReactivate}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-colors disabled:opacity-50"
      >
        {reactivating ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
        구독 유지
      </button>
    </div>
  );
}

// ── 구독 상태 배너 ────────────────────────────────────────────────────────────
function StatusBanner({
  status,
  currentPeriodEndAt,
  onManage,
}: {
  status: SubscriptionStatus;
  currentPeriodEndAt: string | null;
  onManage: () => void;
}) {
  if (status === 'active' || status === 'trialing') {
    const isTrialing = status === 'trialing';
    const endDate = currentPeriodEndAt ? new Date(currentPeriodEndAt) : null;
    const today = new Date();
    const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000)) : null;

    if (!isTrialing) return null;

    return (
      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">무료 체험 기간 중</p>
          <p className="text-blue-400/80">
            {daysLeft !== null ? `체험 종료까지 ${daysLeft}일 남았습니다.` : '체험 기간 중입니다.'}{' '}
            체험 후 자동 결제됩니다.{' '}
            <button onClick={onManage} className="underline hover:text-blue-200 transition-colors">
              구독 관리
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (status === 'past_due') {
    return (
      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">결제 실패 — 서비스가 곧 중단될 수 있습니다</p>
          <p className="text-red-400/80">
            결제 수단을 업데이트하거나 미납 금액을 납부해주세요.{' '}
            <button onClick={onManage} className="underline hover:text-red-200 transition-colors">
              결제 정보 업데이트
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (status === 'canceled') {
    const endDate = currentPeriodEndAt ? new Date(currentPeriodEndAt) : null;
    const isExpired = endDate ? endDate < new Date() : true;

    return (
      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-300 text-sm">
        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">구독이 취소되었습니다</p>
          <p className="text-slate-400">
            {isExpired
              ? 'Pro 기능이 비활성화되었습니다. 아래에서 다시 구독할 수 있습니다.'
              : `${endDate?.toLocaleDateString('ko-KR')}까지 서비스를 이용할 수 있습니다.`}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ── 플랜 카드 ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  current,
  onUpgrade,
  upgrading,
}: {
  plan: PlanDef;
  current: Plan;
  onUpgrade: (p: Plan) => void;
  upgrading: boolean;
}) {
  const isCurrent = plan.id === current;
  const isUpgrade = plan.id !== 'free' && plan.id !== current;
  const Icon = plan.icon;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 gap-5 transition-all ${
        isCurrent
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      {plan.badge && (
        <span className={`absolute -top-3 left-6 ${plan.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
          {plan.badge}
        </span>
      )}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-5 h-5 ${isCurrent ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className="text-lg font-black text-white">{plan.label}</span>
          </div>
          <p className="text-sm text-slate-400">{plan.description}</p>
        </div>
        <div className="text-right">
          {plan.priceKrw === 0 ? (
            <span className="text-2xl font-black text-white">무료</span>
          ) : (
            <>
              <span className="text-2xl font-black text-white">₩{plan.priceKrw.toLocaleString()}</span>
              <span className="text-xs text-slate-500 ml-1">/월</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="flex items-center gap-2 justify-center py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-bold">
          <CheckCircle className="w-4 h-4" />
          현재 플랜
        </div>
      ) : isUpgrade ? (
        <button
          type="button"
          disabled={upgrading}
          onClick={() => onUpgrade(plan.id)}
          className="flex items-center gap-2 justify-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
        >
          {upgrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {plan.label}로 업그레이드
        </button>
      ) : (
        <div className="h-10" />
      )}
    </div>
  );
}

// ── 취소 확인 모달 ────────────────────────────────────────────────────────────
function CancelModal({ onConfirm, onClose, loading }: { onConfirm: () => void; onClose: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-7 max-w-md w-full space-y-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <CalendarX className="w-6 h-6 text-amber-400 shrink-0" />
          <h3 className="text-lg font-black text-white">구독 종료 예약</h3>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          현재 결제 기간이 끝나면 구독이 종료됩니다. 기간 중에는 모든 기능을 계속 이용하실 수 있습니다.
          언제든지 종료 예약을 철회할 수 있습니다.
        </p>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors"
          >
            돌아가기
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            종료 예약
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function SettingsView() {
  const { ctx, loading, refresh } = useProContext();
  const [upgrading, setUpgrading] = useState(false);
  const [managing, setManaging] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'info' | 'error' } | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const currentPlan = ctx.entitlement.plan;
  const subStatus = ctx.entitlement.status;
  const cancelAtPeriodEnd = ctx.billing.cancelAtPeriodEnd;
  const hasActiveSubscription =
    currentPlan !== 'free' && (subStatus === 'active' || subStatus === 'trialing' || subStatus === 'past_due');

  const handleUpgrade = async (plan: Plan) => {
    if (!ctx.dbReady) {
      setMsg({ text: 'DB 마이그레이션 후 결제를 진행할 수 있습니다.', type: 'info' });
      return;
    }
    setUpgrading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        setMsg({ text: data.error ?? '결제 페이지를 여는 데 실패했습니다.', type: 'error' });
      }
    } catch {
      setMsg({ text: '네트워크 오류가 발생했습니다.', type: 'error' });
    } finally {
      setUpgrading(false);
    }
  };

  const handleManage = async () => {
    setManaging(true);
    setMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/billing/portal', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        setMsg({ text: data.error ?? '구독 관리 페이지를 여는 데 실패했습니다.', type: 'error' });
      }
    } catch {
      setMsg({ text: '네트워크 오류가 발생했습니다.', type: 'error' });
    } finally {
      setManaging(false);
    }
  };

  const handleCancel = async () => {
    setCanceling(true);
    setMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/billing/cancel', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        await refresh();
        setShowCancelModal(false);
        setMsg({ text: '구독 종료가 예약되었습니다. 결제 기간이 끝나면 자동 종료됩니다.', type: 'info' });
      } else {
        setMsg({ text: data.error ?? '구독 취소에 실패했습니다.', type: 'error' });
        setShowCancelModal(false);
      }
    } catch {
      setMsg({ text: '네트워크 오류가 발생했습니다.', type: 'error' });
      setShowCancelModal(false);
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    setMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/billing/reactivate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        await refresh();
        setMsg({ text: '구독 종료 예약이 취소되었습니다. 계속 이용하실 수 있습니다.', type: 'info' });
      } else {
        setMsg({ text: data.error ?? '구독 유지 처리에 실패했습니다.', type: 'error' });
      }
    } catch {
      setMsg({ text: '네트워크 오류가 발생했습니다.', type: 'error' });
    } finally {
      setReactivating(false);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    setMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/context/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        await refresh();
        setMsg({ text: data.bootstrapped ? `센터 "${data.centerName}"가 생성되었습니다.` : '이미 센터가 설정되어 있습니다.', type: 'info' });
      } else {
        setMsg({ text: '센터 생성에 실패했습니다: ' + (data.error ?? '알 수 없는 오류'), type: 'error' });
      }
    } catch {
      setMsg({ text: '네트워크 오류가 발생했습니다.', type: 'error' });
    } finally {
      setBootstrapping(false);
    }
  };

  if (loading) {
    return (
      <section className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>구독 정보 불러오는 중...</span>
        </div>
      </section>
    );
  }

  return (
    <>
    {showCancelModal && (
      <CancelModal
        onConfirm={handleCancel}
        onClose={() => setShowCancelModal(false)}
        loading={canceling}
      />
    )}
    <section className="px-6 lg:px-12 py-10 pb-32 space-y-10 max-w-4xl mx-auto">
      {/* 헤더 */}
      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs font-bold uppercase tracking-widest">
          <Settings2 className="w-4 h-4" /> 구독 및 설정
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">플랜 &amp; 결제</h2>
        <p className="text-slate-400 font-medium">
          현재 플랜을 확인하고 필요에 따라 업그레이드하세요.
        </p>
      </header>

      {/* 현재 센터 + 구독 상태 */}
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-[220px] p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-1">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">현재 센터</p>
          {ctx.activeCenterId ? (
            <>
              <p className="text-lg font-bold text-white">{ctx.centers[0]?.name ?? '내 센터'}</p>
              <p className="text-xs text-slate-400">역할: {ctx.role ?? 'owner'}</p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">센터가 설정되지 않았습니다.</p>
              {ctx.dbReady ? (
                <button
                  type="button"
                  onClick={handleBootstrap}
                  disabled={bootstrapping}
                  className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  {bootstrapping ? '생성 중...' : '내 센터 자동 생성 →'}
                </button>
              ) : (
                <p className="text-xs text-slate-500">DB 마이그레이션 후 활성화됩니다.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-[220px] p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">현재 플랜</p>
          <p className="text-lg font-bold text-white capitalize">{currentPlan}</p>
          <p className="text-xs text-slate-400">
            상태:{' '}
            <span
              className={
                subStatus === 'active' ? 'text-emerald-400'
                  : subStatus === 'trialing' ? 'text-blue-400'
                  : subStatus === 'past_due' ? 'text-red-400'
                  : 'text-slate-400'
              }
            >
              {subStatus === 'active' ? '활성'
                : subStatus === 'trialing' ? '체험 중'
                : subStatus === 'past_due' ? '결제 실패'
                : subStatus === 'canceled' ? '취소됨'
                : subStatus}
            </span>
          </p>
          {ctx.billing.currentPeriodEndAt && (
            <p className="text-xs text-slate-400">
              갱신일: {new Date(ctx.billing.currentPeriodEndAt).toLocaleDateString('ko-KR')}
            </p>
          )}
          {hasActiveSubscription && (
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={managing}
                onClick={handleManage}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                {managing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                구독 관리
              </button>
              {!cancelAtPeriodEnd && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  <CalendarX className="w-3 h-3" />
                  구독 취소
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 구독 상태 배너 */}
      <StatusBanner
        status={subStatus}
        currentPeriodEndAt={ctx.billing.currentPeriodEndAt}
        onManage={handleManage}
      />

      {/* 종료 예약 배너 */}
      {cancelAtPeriodEnd && hasActiveSubscription && (
        <CancelScheduledBanner
          currentPeriodEndAt={ctx.billing.currentPeriodEndAt}
          onReactivate={handleReactivate}
          reactivating={reactivating}
        />
      )}

      {/* 피드백 메시지 */}
      {msg && (
        <div
          className={`px-5 py-4 rounded-xl text-sm ${
            msg.type === 'error'
              ? 'bg-red-500/10 border border-red-500/20 text-red-300'
              : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={currentPlan}
            onUpgrade={handleUpgrade}
            upgrading={upgrading}
          />
        ))}
      </div>

      {/* DB 미준비 안내 */}
      {!ctx.dbReady && (
        <div className="px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm space-y-1">
          <p className="font-bold">구독 DB 마이그레이션 미적용</p>
          <p className="text-amber-400/80">
            Supabase에서{' '}
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">20260308000000_spokedu_pro_commercial.sql</code>
            을 실행하고{' '}
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">SPOKEDU_PRO_DB_READY=true</code>{' '}
            환경변수를 설정하면 구독 기능이 활성화됩니다.
          </p>
        </div>
      )}

      {/* 문의 */}
      <div className="text-center text-sm text-slate-500 pt-4">
        결제 문의 또는 기업 계약:{' '}
        <a href="mailto:contact@spokedu.co.kr" className="text-blue-400 hover:underline">
          contact@spokedu.co.kr
        </a>
      </div>
    </section>
    </>
  );
}
