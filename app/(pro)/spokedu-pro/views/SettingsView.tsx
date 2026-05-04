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

const PLAN_TIER: Record<Plan, number> = { free: 0, basic: 1, pro: 2 };

function planTierCompare(planId: Plan, current: Plan): number {
  return PLAN_TIER[planId] - PLAN_TIER[current];
}

function planUpgradeCtaLabel(planId: Plan): string {
  if (planId === 'basic') return 'Library 시작하기';
  if (planId === 'pro') return 'All-in-One 도입 문의';
  return '도입 문의';
}

// ── Trial 배너 ───────────────────────────────────────────────────────────────
function TrialBanner({ trialEndAt }: { trialEndAt: string }) {
  const t = useTranslator();
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  return (
    <div className="rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/12 to-slate-900/40 px-4 py-4 sm:px-5">
      <div className="flex gap-3">
        <Timer className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="text-[15px] font-bold leading-snug text-white sm:text-base">{t('현재 14일 프리미엄 체험 중')}</p>
          <p className="text-sm leading-relaxed text-violet-100/90">
            {t('놀이체육 라이브러리와 SPOMOVE를 바로 써보세요.')}
            <span className="mt-1 block text-xs font-semibold tabular-nums text-violet-200/80">D-{daysLeft}</span>
          </p>
          <p className="text-xs leading-relaxed text-slate-400 border-t border-white/10 pt-2">
            {t('체험 종료 후 체험 플랜으로 전환')}
          </p>
        </div>
      </div>
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
  neutralZero = false,
  zeroHint,
}: {
  used: number;
  limit: number | null;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  warningThreshold?: number;
  /** 한도 0·사용 0일 때 경고 톤 대신 안내용(예: 체험 계정) */
  neutralZero?: boolean;
  zeroHint?: string;
}) {
  const t = useTranslator();
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min((used / limit!) * 100, 100);
  const zeroBand = neutralZero && !isUnlimited && limit === 0 && used === 0;
  const isWarning = !zeroBand && !isUnlimited && pct >= warningThreshold * 100;
  const isFull = !zeroBand && !isUnlimited && used >= limit!;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Icon className="w-4 h-4 text-slate-400" />
          {t(label)}
        </div>
        <span
          className={`font-bold tabular-nums ${
            zeroBand ? 'text-slate-500 font-semibold' : isFull ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-300'
          }`}
        >
          {isUnlimited ? (
            <span className="text-emerald-400 text-xs font-bold">{t('무제한')}</span>
          ) : (
            `${used.toLocaleString()} / ${limit!.toLocaleString()}`
          )}
        </span>
      </div>
      {!isUnlimited && !zeroBand && (
        <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFull ? 'bg-red-500' : isWarning ? 'bg-amber-500' : colorClass
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {zeroBand && zeroHint ? <p className="text-xs text-slate-500 leading-relaxed">{zeroHint}</p> : null}
      {isFull && !zeroBand && (
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
  compareCompact = false,
}: {
  plan: PlanDef;
  current: Plan;
  onUpgrade: (p: Plan) => void;
  upgrading: boolean;
  compareCompact?: boolean;
}) {
  const t = useTranslator();
  const isCurrent = plan.id === current;
  const tierDelta = planTierCompare(plan.id, current);
  /** 현재보다 상위 플랜 카드: basic / pro 만 결제·문의 CTA (free는 항상 최하위) */
  const isUpgradeTarget = !isCurrent && tierDelta > 0 && (plan.id === 'basic' || plan.id === 'pro');
  const Icon = plan.icon;
  const featureRows = compareCompact ? plan.features.slice(0, 3) : plan.features;

  return (
    <div
      className={`relative flex flex-col rounded-xl border transition-all ${
        compareCompact ? 'p-4 gap-3' : 'p-5 gap-4'
      } ${
        isCurrent
          ? 'border-slate-600/80 bg-slate-800/40 ring-0'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      {plan.badge && !compareCompact ? (
        <span className={`absolute -top-3 left-5 ${plan.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow`}>
          {plan.badge ? t(plan.badge) : null}
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Icon className={`w-4 h-4 ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`} />
            <span className={compareCompact ? 'text-sm font-black text-white' : 'text-base font-black text-white'}>
              {t(plan.label)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 line-clamp-2">{t(plan.description)}</p>
        </div>
        <div className="text-right shrink-0">
          {plan.priceKrw === 0 ? (
            <span className={compareCompact ? 'text-lg font-black text-white' : 'text-xl font-black text-white'}>
              {t('무료')}
            </span>
          ) : (
            <>
              <span className={compareCompact ? 'text-lg font-black text-white' : 'text-xl font-black text-white'}>
                ₩{plan.priceKrw.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 ml-0.5">{t('/월')}</span>
            </>
          )}
        </div>
      </div>

      <ul className={compareCompact ? 'space-y-1 flex-1' : 'space-y-1.5 flex-1'}>
        {featureRows.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500/85 mt-0.5 shrink-0" />
            <span>{t(f)}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="flex items-center gap-2 justify-center py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 text-xs font-bold">
          <CheckCircle className="w-3.5 h-3.5" />
          {t('현재 플랜')}
        </div>
      ) : isUpgradeTarget ? (
        <button
          type="button"
          disabled={upgrading}
          onClick={() => onUpgrade(plan.id)}
          className="flex items-center gap-1.5 justify-center py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
        >
          {upgrading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          {t(planUpgradeCtaLabel(plan.id))}
        </button>
      ) : (
        <div className="flex items-center justify-center py-1.5 px-2 rounded-lg bg-slate-700/30 border border-slate-600/40 text-slate-500 text-[11px] font-semibold text-center leading-snug">
          {t('현재 이용 중인 플랜에 포함됨')}
        </div>
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
  const [bootstrapTrialGate, setBootstrapTrialGate] = useState(false);
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
    setBootstrapTrialGate(false);
    try {
      const res = await fetch('/api/spokedu-pro/context/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        bootstrapped?: boolean;
        centerName?: string;
        error?: string;
        message?: string;
      };
      if (res.status === 403 && data.error === 'trial_not_approved') {
        setBootstrapTrialGate(true);
        return;
      }
      if (data.ok) {
        await refresh();
        setUpgradeMsg(
          data.bootstrapped
            ? `센터 "${data.centerName}"가 생성되었습니다. 14일 프리미엄 체험이 시작됩니다.`
            : '이미 센터가 설정되어 있습니다.'
        );
      } else {
        setUpgradeMsg(
          '센터 생성에 실패했습니다: ' + (typeof data.message === 'string' ? data.message : data.error ?? '알 수 없는 오류')
        );
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
              {t(' — 카드 정보를 확인하거나 아래에서 정기결제를 다시 시도해 주세요. 계속 문제가 있으면')}{' '}
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

      {isTrialing && ctx.billing.currentPeriodEndAt && (
        <TrialBanner trialEndAt={ctx.billing.currentPeriodEndAt} />
      )}

      <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-4 py-4 sm:px-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('플랜')}</p>
            <p className="mt-0.5 text-sm font-bold text-white">{t(PLAN_UI_META[currentPlan].label)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('상태')}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-200">
              {statusLabel[ctx.entitlement.status] ?? ctx.entitlement.status}
            </p>
          </div>
        </div>
        <div className="border-t border-slate-700/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('센터')}</p>
          <p className="mt-0.5 text-sm text-slate-200 leading-snug break-words">
            {ctx.activeCenterId ? ctx.centers[0]?.name ?? t('내 센터') : t('연결 전(선택)')}
          </p>
        </div>
        {ctx.billing.currentPeriodEndAt ? (
          <p className="text-xs text-slate-500 leading-relaxed">
            {isTrialing ? t('체험 종료: ') : t('갱신일: ')}
            {new Date(ctx.billing.currentPeriodEndAt).toLocaleDateString('ko-KR')}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-4 text-sm text-slate-200 leading-relaxed">
        <p className="font-bold text-blue-200 mb-1">{t('결제 안내')}</p>
        {checkoutEnabled ? (
          <p className="text-slate-300">
            {t(
              '카드 정기결제로 바로 시작할 수 있습니다. 도입 과정에서 도움이 필요하시면 이메일로 문의해 주세요.'
            )}{' '}
            <a href="mailto:contact@spokedu.co.kr" className="text-blue-400 font-bold underline underline-offset-2">
              contact@spokedu.co.kr
            </a>
          </p>
        ) : (
          <>
            <p className="text-slate-300">
              {t(
                '현재는 운영팀을 통해 수동으로 플랜 전환을 도와드리고 있습니다. 도입을 원하시면 이메일로 문의해 주세요.'
              )}{' '}
              <a href="mailto:contact@spokedu.co.kr" className="text-blue-400 font-bold underline underline-offset-2">
                contact@spokedu.co.kr
              </a>
            </p>
            <details className="mt-2 text-slate-500 text-xs">
              <summary className="cursor-pointer font-bold text-slate-400 hover:text-slate-300">
                {t('결제 연동을 방금 켠 경우(운영)')}
              </summary>
              <p className="mt-2 pl-1 border-l border-slate-600/80">
                {t('아래를 눌러 이 화면에서 결제 버튼 표시를 다시 불러오세요.')}
              </p>
            </details>
          </>
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
                {checkoutLoading ? t('처리 중...') : t('Library 카드 정기결제')}
              </button>
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => void handleStripeCheckout('pro')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {checkoutLoading ? t('처리 중...') : t('All-in-One 카드 정기결제')}
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
                <p className="text-slate-400 text-xs mb-2">
                  {t('카드 갱신·청구 내역·구독 변경은 고객 포털에서 할 수 있어요.')}
                </p>
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
                  {portalLoading ? t('처리 중...') : t('카드·구독 관리 열기')}
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
          neutralZero={usage.aiReportMonthlyLimit === 0 && usage.aiReportThisMonth === 0}
          zeroHint={t('체험 계정에서는 리포트 기능 확인이 제한될 수 있습니다')}
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
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t('플랜 비교')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={currentPlan}
              onUpgrade={handleUpgrade}
              upgrading={upgrading}
              compareCompact
            />
          ))}
        </div>
      </div>

      {!ctx.activeCenterId ? (
        <details className="rounded-xl border border-slate-700/60 bg-slate-900/30 px-4 py-3 text-sm text-slate-400">
          <summary className="cursor-pointer list-none font-bold text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
            {t('센터 연결·체험 시작(선택)')}
          </summary>
          <div className="mt-3 space-y-3 border-t border-slate-700/50 pt-3">
            <p className="text-xs leading-relaxed text-slate-500">
              {t('라이브러리·SPOMOVE 수업 준비는 센터 없이도 이용할 수 있어요. 기관 단위로 쓰실 때만 아래에서 센터를 만들면 됩니다.')}
            </p>
            {bootstrapTrialGate ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100 space-y-3">
                <p className="leading-relaxed">
                  SPOKEDU PRO 체험은 베타 관장단 신청 후 운영팀 승인으로 제공됩니다.
                  <br />
                  아직 신청하지 않으셨다면 베타 관장단 신청을 먼저 진행해 주세요.
                  <br />
                  <br />
                  이미 신청하셨다면, 신청한 이메일과 현재 로그인한 이메일이 같은지 확인해 주세요.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/pro/apply"
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-center text-sm font-black text-white hover:bg-amber-500"
                  >
                    베타 관장단 신청하기
                  </Link>
                  <button
                    type="button"
                    onClick={() => setBootstrapTrialGate(false)}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-bold text-amber-200 hover:bg-amber-950/40"
                  >
                    다시 시도
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleBootstrap()}
                disabled={bootstrapping}
                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
              >
                {bootstrapping ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                {bootstrapping ? t('생성 중...') : t('14일 프리미엄 체험 시작')}
              </button>
            )}
          </div>
        </details>
      ) : (
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/25 px-4 py-2.5 text-xs text-slate-500">
          {t('역할:')}{' '}
          <span className="font-medium text-slate-300">{ctx.role ?? 'owner'}</span>
        </div>
      )}

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
