'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Settings2, CheckCircle, Zap, Crown, Building2, RefreshCw,
  Bot, Mail, ChevronRight, AlertTriangle, LayoutGrid, Timer, ExternalLink,
} from 'lucide-react';
import { useProContext, type Plan } from '../hooks/useProContext';
import { trackSpokeduProEvent } from '../utils/spokeduProAnalytics';
import { PLAN_PRICES, PLAN_UI_META, PLAN_UI_ORDER } from '@/app/lib/spokedu-pro/planCatalog';

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

const PLAN_ICON: Record<Plan, React.ElementType> = {
  free: Building2,
  basic: Zap,
  pro: Crown,
};

const PLANS: PlanDef[] = PLAN_UI_ORDER.map((id) => ({
  id,
  label: PLAN_UI_META[id].label,
  priceKrw: PLAN_PRICES[id],
  description: PLAN_UI_META[id].description,
  features: PLAN_UI_META[id].features,
  badge: PLAN_UI_META[id].badge,
  badgeColor: PLAN_UI_META[id].badgeColor,
  icon: PLAN_ICON[id],
}));

// ── Trial 배너 ───────────────────────────────────────────────────────────────
function TrialBanner({ trialEndAt }: { trialEndAt: string }) {
  const t = useTranslator();
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 text-sm">
      <Timer className="w-4 h-4 text-violet-400 shrink-0" />
      <span className="text-violet-300 font-bold">
        {t(`14일 무료 체험 중 · AI 리포트 20회 · D-${daysLeft}`)}
      </span>
      <span className="text-slate-400 text-xs ml-auto">{t('체험 종료 후 Free 전환')}</span>
    </div>
  );
}

// ── 사용량 진행 바 ───────────────────────────────────────────────────────────
function UsageBar({
  used,
  limit,
  label,
  icon: Icon,
  colorClass,
  warningThreshold = 0.8,
}: {
  used: number;
  limit: number | null;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  warningThreshold?: number;
}) {
  const t = useTranslator();
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min((used / limit!) * 100, 100);
  const isWarning = !isUnlimited && pct >= warningThreshold * 100;
  const isFull = !isUnlimited && used >= limit!;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Icon className="w-4 h-4 text-slate-400" />
          {t(label)}
        </div>
        <span className={`font-bold tabular-nums ${isFull ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-300'}`}>
          {isUnlimited ? (
            <span className="text-emerald-400 text-xs font-bold">{t('무제한')}</span>
          ) : (
            `${used.toLocaleString()} / ${limit!.toLocaleString()}`
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFull ? 'bg-red-500' : isWarning ? 'bg-amber-500' : colorClass
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isFull && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertTriangle className="w-3 h-3" />
          {t('한도 초과 — 업그레이드가 필요합니다')}
        </p>
      )}
    </div>
  );
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
  const t = useTranslator();
  const isCurrent = plan.id === current;
  const isUpgrade = plan.id !== 'free' && plan.id !== current;
  const Icon = plan.icon;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 gap-4 transition-all ${
        isCurrent
          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      {plan.badge && (
        <span className={`absolute -top-3 left-5 ${plan.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow`}>
          {plan.badge ? t(plan.badge) : null}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${isCurrent ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className="text-base font-black text-white">{t(plan.label)}</span>
          </div>
          <p className="text-xs text-slate-400">{t(plan.description)}</p>
        </div>
        <div className="text-right shrink-0">
          {plan.priceKrw === 0 ? (
            <span className="text-xl font-black text-white">{t('무료')}</span>
          ) : (
            <>
              <span className="text-xl font-black text-white">₩{plan.priceKrw.toLocaleString()}</span>
              <span className="text-xs text-slate-500 ml-0.5">{t('/월')}</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-1.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-sm text-slate-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
            {t(f)}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-bold">
          <CheckCircle className="w-3.5 h-3.5" />
          {t('현재 플랜')}
        </div>
      ) : isUpgrade ? (
        <button
          type="button"
          disabled={upgrading}
          onClick={() => onUpgrade(plan.id)}
          className="flex items-center gap-1.5 justify-center py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
        >
          {upgrading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          {t(`${plan.label} 도입 문의`)}
        </button>
      ) : (
        <div className="h-9" />
      )}
    </div>
  );
}

export default function SettingsView() {
  const t = useTranslator();
  const { ctx, loading, refresh } = useProContext();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const recheckCheckout = useCallback(() => {
    void fetch('/api/spokedu-pro/checkout')
      .then((r) => r.json())
      .then((j) => setCheckoutEnabled(!!j?.checkoutEnabled))
      .catch(() => setCheckoutEnabled(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/spokedu-pro/checkout')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j?.checkoutEnabled === true) setCheckoutEnabled(true);
      })
      .catch(() => {
        if (!cancelled) setCheckoutEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPlan = ctx.entitlement.plan;
  const isTrialing = ctx.entitlement.status === 'trialing';
  const isPastDue = ctx.entitlement.status === 'past_due';
  const { usage } = ctx;
  const statusLabel: Record<string, string> = {
    trialing: t('체험 중'),
    active: t('활성'),
    past_due: t('결제 지연'),
    canceled: t('해지됨'),
    expired: t('만료'),
  };

  const handleUpgrade = async (plan: Plan) => {
    setUpgrading(true);
    setUpgradeMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/plan-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setUpgradeMsg(data.error ?? data.message ?? '도입 문의 접수에 실패했습니다. 잠시 후 다시 시도하거나 이메일로 문의해 주세요.');
        return;
      }
      setUpgradeMsg(typeof data.message === 'string' ? data.message : '도입 문의가 접수되었습니다.');
    } catch {
      setUpgradeMsg('네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleOpenBillingPortal = useCallback(async () => {
    trackSpokeduProEvent('spokedu_pro_billing_portal_open', {});
    setPortalLoading(true);
    try {
      const res = await fetch('/api/spokedu-pro/billing-portal', {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        message?: string;
        error?: string;
        configured?: boolean;
      };
      if (res.status === 503 && data.configured === false) {
        toast.message(t('온라인 결제'), { description: t('결제 연동이 아직 설정되지 않았습니다.') });
        return;
      }
      if (!res.ok || !data.ok || !data.url) {
        toast.error(
          typeof data.message === 'string'
            ? data.message
            : (data.error ?? t('결제 관리 페이지를 열지 못했습니다.'))
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error(t('네트워크 오류가 발생했습니다.'));
    } finally {
      setPortalLoading(false);
    }
  }, [t]);

  const handleStripeCheckout = async (plan: 'basic' | 'pro') => {
    trackSpokeduProEvent('spokedu_pro_checkout_start', { plan });
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/spokedu-pro/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        message?: string;
        error?: string;
        configured?: boolean;
      };
      if (res.status === 503 && data.configured === false) {
        toast.message(t('온라인 결제'), { description: t('결제 연동이 아직 설정되지 않았습니다. 이메일 문의를 이용해 주세요.') });
        return;
      }
      if (!res.ok || !data.ok || !data.url) {
        toast.error(data.message ?? data.error ?? t('결제 페이지를 열지 못했습니다.'));
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error(t('네트워크 오류가 발생했습니다.'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    setUpgradeMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/context/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        await refresh();
        setUpgradeMsg(
          data.bootstrapped
            ? `센터 "${data.centerName}"가 생성되었습니다. 14일 무료 체험이 시작됩니다.`
            : '이미 센터가 설정되어 있습니다.'
        );
      } else {
        setUpgradeMsg('센터 생성에 실패했습니다: ' + (data.error ?? '알 수 없는 오류'));
      }
    } catch {
      setUpgradeMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setBootstrapping(false);
    }
  };

  if (loading) {
    return (
      <section className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{t('구독 정보 불러오는 중...')}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 lg:px-12 py-10 pb-32 space-y-8 max-w-4xl mx-auto">

      {/* 헤더 */}
      <header className="space-y-2 border-b border-slate-800 pb-7">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs font-bold uppercase tracking-widest">
          <Settings2 className="w-3.5 h-3.5" /> {t('구독 및 설정')}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{t('플랜 & 사용량')}</h2>
        <p className="text-slate-400 text-sm">{t('현재 플랜과 사용량을 확인하고 필요에 따라 업그레이드하세요.')}</p>
      </header>

      {isPastDue && (
        <div
          id="spokedu-checkout-retry"
          className="rounded-2xl border border-rose-500/40 bg-rose-950/35 px-5 py-4 text-sm text-rose-50 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-bold text-rose-100">{t('결제 지연')}</span>
              {t(' — 카드 정보를 확인하거나 아래에서 Stripe 결제를 다시 시도해 주세요. 계속 문제가 있으면')}{' '}
              <a href="mailto:contact@spokedu.co.kr" className="text-rose-200 font-bold underline underline-offset-2">
                {t('이메일')}
              </a>
              {t('로 알려 주세요.')}
            </p>
          </div>
          {checkoutEnabled && (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('spokedu-stripe-checkout-actions');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="shrink-0 min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold"
            >
              {t('결제 다시 시도하기')}
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-4 text-sm text-slate-200 leading-relaxed">
        <p className="font-bold text-blue-200 mb-1">{t('결제 안내')}</p>
        {checkoutEnabled ? (
          <p className="text-slate-300">
            {t('Stripe Checkout으로 카드 정기결제를 진행할 수 있습니다. 문제가 있으면')}{' '}
            <a href="mailto:contact@spokedu.co.kr" className="text-blue-400 font-bold underline underline-offset-2">
              {t('이메일')}
            </a>
            {t('로 문의해 주세요.')}
          </p>
        ) : (
          <p className="text-slate-300">
            {t('현재 자동 결제(카드·정기결제)는 미지원입니다. 플랜 변경은')}{' '}
            <a href="mailto:contact@spokedu.co.kr" className="text-blue-400 font-bold underline underline-offset-2">
              {t('이메일')}
            </a>
            {t('문의로 수동 전환 안내를 드립니다.')}
            <span className="block mt-2 text-slate-500 text-xs">
              {t('서버에 Stripe 키를 방금 넣었다면, 아래를 눌러 이 화면에서 결제 버튼 표시를 다시 불러오세요.')}
            </span>
          </p>
        )}
        {checkoutEnabled && (
          <div id="spokedu-stripe-checkout-actions" className="flex flex-col gap-2 mt-3 scroll-mt-24">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => void handleStripeCheckout('basic')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {checkoutLoading ? t('처리 중...') : t('Basic — Stripe 결제')}
              </button>
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => void handleStripeCheckout('pro')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {checkoutLoading ? t('처리 중...') : t('Pro — Stripe 결제')}
              </button>
            </div>
            <p className="text-slate-500 text-xs">
              {t('결제 창이 열리지 않으면 같은 버튼을 한 번 더 누르거나, 연동 상태를 다시 불러온 뒤 재시도해 주세요.')}
            </p>
            <button
              type="button"
              onClick={() => void recheckCheckout()}
              className="self-start text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              {t('결제 연동 상태 다시 불러오기')}
            </button>
            {ctx.billing.stripeCustomerId && (
              <div className="pt-3 mt-2 border-t border-blue-500/20">
                <p className="text-slate-400 text-xs mb-2">{t('카드 갱신·청구 내역·구독 변경은 Stripe 고객 포털에서 할 수 있어요.')}</p>
                <button
                  type="button"
                  disabled={portalLoading || checkoutLoading}
                  onClick={() => void handleOpenBillingPortal()}
                  className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-50"
                >
                  {portalLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  )}
                  {portalLoading ? t('처리 중...') : t('Stripe에서 결제·구독 관리')}
                </button>
              </div>
            )}
          </div>
        )}
        {!checkoutEnabled && (
          <button
            type="button"
            onClick={() => void recheckCheckout()}
            className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            {t('결제 연동 상태 다시 불러오기')}
          </button>
        )}
        <p className="text-slate-400 text-xs mt-3">
          <Link href="/spokedu-pro/legal/subscription" className="text-blue-400 font-bold underline underline-offset-2">
            {t('구독·청약철회·환불 안내')}
          </Link>
        </p>
      </div>

      {/* Trial 배너 */}
      {isTrialing && ctx.billing.currentPeriodEndAt && (
        <TrialBanner trialEndAt={ctx.billing.currentPeriodEndAt} />
      )}

      {/* 현재 상태 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-1.5">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('현재 센터')}</p>
          {ctx.activeCenterId ? (
            <>
              <p className="text-base font-bold text-white">{ctx.centers[0]?.name ?? t('내 센터')}</p>
              <p className="text-xs text-slate-400">
                {t('역할:')} <span className="text-slate-300 font-medium">{ctx.role ?? 'owner'}</span>
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">{t('센터가 설정되지 않았습니다.')}</p>
              <button
                type="button"
                onClick={handleBootstrap}
                disabled={bootstrapping}
                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {bootstrapping ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                {bootstrapping ? t('생성 중...') : t('14일 무료 체험 시작')}
              </button>
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-1.5">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('현재 플랜')}</p>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white capitalize">{currentPlan}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isTrialing
                  ? 'bg-violet-500/20 text-violet-400'
                  : ctx.entitlement.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {statusLabel[ctx.entitlement.status] ?? ctx.entitlement.status}
            </span>
          </div>
          {ctx.billing.currentPeriodEndAt && (
            <p className="text-xs text-slate-400">
              {isTrialing ? t('체험 종료: ') : t('갱신일: ')}
              {new Date(ctx.billing.currentPeriodEndAt).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
      </div>

      {/* 사용량 */}
      <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('이번 달 사용량')}</p>
        <UsageBar
          used={usage.classCount}
          limit={usage.classLimit}
          label="반 수"
          icon={LayoutGrid}
          colorClass="bg-emerald-500"
        />
        <div className="border-t border-slate-700/60" />
        <UsageBar
          used={usage.aiReportThisMonth}
          limit={usage.aiReportMonthlyLimit}
          label="AI 리포트 (이번 달)"
          icon={Bot}
          colorClass="bg-violet-500"
        />
      </div>

      {/* 업그레이드 메시지 */}
      {upgradeMsg && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
          <Mail className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t(upgradeMsg)}</span>
        </div>
      )}

      {/* 플랜 카드 */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{t('플랜 비교')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>

      {/* 문의 */}
      <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-2">
        <Mail className="w-4 h-4" />
        {t('결제·기업 계약 문의:')}{' '}
        <a href="mailto:contact@spokedu.co.kr" className="text-blue-400 hover:underline font-medium">
          contact@spokedu.co.kr
        </a>
      </div>
    </section>
  );
}
