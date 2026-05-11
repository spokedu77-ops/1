'use client';

import type { ElementType } from 'react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslator } from '@/app/providers/I18nProvider';
import { PLAN_PRICES, PLAN_UI_META, PLAN_UI_ORDER } from '@/app/lib/spokedu-pro/planCatalog';
import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle,
  ChevronRight,
  Crown,
  ExternalLink,
  LayoutGrid,
  Mail,
  RefreshCw,
  Settings2,
  Timer,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { SubscriberButton } from '../components/SubscriberWorkspacePrimitives';
import { useProContext, type Plan } from '../hooks/useProContext';
import { trackSpokeduProEvent } from '../utils/spokeduProAnalytics';

type PlanDef = {
  id: Plan;
  label: string;
  priceKrw: number;
  description: string;
  features: string[];
  badge?: string;
  badgeColor?: string;
  icon: ElementType;
};

const PLAN_ICON: Record<Plan, ElementType> = {
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

function TrialBanner({ trialEndAt }: { trialEndAt: string }) {
  const t = useTranslator();
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/12 to-slate-900/40 px-4 py-4 sm:px-5">
      <div className="flex gap-3">
        <Timer className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="text-[15px] font-bold leading-snug text-white sm:text-base">{t('현재 14일 프리미엄 체험 중')}</p>
          <p className="text-sm leading-relaxed text-violet-100/90">
            {t('전체 라이브러리와 SPOMOVE를 바로 살펴볼 수 있어요.')}
            <span className="mt-1 block text-xs font-semibold tabular-nums text-violet-200/80">D-{daysLeft}</span>
          </p>
          <p className="border-t border-white/10 pt-2 text-xs leading-relaxed text-slate-400">
            {t('체험 종료 후에는 선택한 플랜 기준으로 이용 범위가 적용됩니다.')}
          </p>
        </div>
      </div>
    </div>
  );
}

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
  icon: ElementType;
  colorClass: string;
  warningThreshold?: number;
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
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Icon className="h-4 w-4 text-slate-400" />
          {t(label)}
        </div>
        <span
          className={`font-bold tabular-nums ${
            zeroBand ? 'font-semibold text-slate-500' : isFull ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-300'
          }`}
        >
          {isUnlimited ? (
            <span className="text-xs font-bold text-emerald-400">{t('무제한')}</span>
          ) : (
            `${used.toLocaleString()} / ${limit!.toLocaleString()}`
          )}
        </span>
      </div>
      {!isUnlimited && !zeroBand ? (
        <div className="h-2 overflow-hidden rounded-full bg-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : isWarning ? 'bg-amber-500' : colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {zeroBand && zeroHint ? <p className="text-xs leading-relaxed text-slate-500">{zeroHint}</p> : null}
      {isFull && !zeroBand ? (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {t('한도에 도달했습니다. 플랜 업그레이드가 필요할 수 있어요.')}
        </p>
      ) : null}
    </div>
  );
}

function PlanCard({
  plan,
  current,
  onUpgrade,
  upgrading,
}: {
  plan: PlanDef;
  current: Plan;
  onUpgrade: (plan: Plan) => void;
  upgrading: boolean;
}) {
  const t = useTranslator();
  const isCurrent = plan.id === current;
  const tierDelta = planTierCompare(plan.id, current);
  const isUpgradeTarget = !isCurrent && tierDelta > 0 && (plan.id === 'basic' || plan.id === 'pro');
  const Icon = plan.icon;
  const featureRows = plan.features.slice(0, 3);

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-xl border p-4 transition-all ${
        isCurrent ? 'border-slate-600/80 bg-slate-800/40' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      {plan.badge ? (
        <span className={`absolute -top-3 left-5 ${plan.badgeColor} rounded-full px-3 py-1 text-xs font-bold text-white shadow`}>
          {t(plan.badge)}
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <Icon className={`h-4 w-4 ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`} />
            <span className="text-sm font-black text-white">{t(plan.label)}</span>
          </div>
          <p className="line-clamp-2 text-[11px] text-slate-500">{t(plan.description)}</p>
        </div>
        <div className="shrink-0 text-right">
          {plan.priceKrw === 0 ? (
            <span className="text-lg font-black text-white">{t('무료')}</span>
          ) : (
            <>
              <span className="text-lg font-black text-white">{plan.priceKrw.toLocaleString()}원</span>
              <span className="ml-0.5 text-xs text-slate-500">{t('/월')}</span>
            </>
          )}
        </div>
      </div>

      <ul className="flex-1 space-y-1">
        {featureRows.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs leading-snug text-slate-300">
            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/85" />
            <span>{t(feature)}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 py-1.5 text-xs font-bold text-slate-300">
          <CheckCircle className="h-3.5 w-3.5" />
          {t('현재 플랜')}
        </div>
      ) : isUpgradeTarget ? (
        <button
          type="button"
          disabled={upgrading}
          onClick={() => onUpgrade(plan.id)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {upgrading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {t(planUpgradeCtaLabel(plan.id))}
        </button>
      ) : (
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/30 px-2 py-1.5 text-center text-[11px] font-semibold leading-snug text-slate-500">
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
      .then((res) => res.json())
      .then((data) => setCheckoutEnabled(!!data?.checkoutEnabled))
      .catch(() => setCheckoutEnabled(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/spokedu-pro/checkout')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.checkoutEnabled === true) setCheckoutEnabled(true);
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
        toast.message(t('오프라인 결제'), { description: t('결제 연동이 아직 설정되지 않았습니다.') });
        return;
      }
      if (!res.ok || !data.ok || !data.url) {
        toast.error(typeof data.message === 'string' ? data.message : data.error ?? t('결제 관리 페이지를 열지 못했습니다.'));
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
        toast.message(t('오프라인 결제'), { description: t('결제 연동이 아직 설정되지 않았습니다. 이메일 문의를 이용해 주세요.') });
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
            ? `센터 "${data.centerName}"가 생성되었습니다. 14일 프리미엄 체험을 시작합니다.`
            : '이미 센터가 설정되어 있습니다.'
        );
      } else {
        setUpgradeMsg(`센터 생성에 실패했습니다: ${typeof data.message === 'string' ? data.message : data.error ?? '알 수 없는 오류'}`);
      }
    } catch {
      setUpgradeMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setBootstrapping(false);
    }
  };

  if (loading) {
    return (
      <section className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{t('구독 정보를 불러오는 중...')}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8 px-4 py-10 pb-32 sm:px-6 lg:px-12">
      <header className="space-y-2 border-b border-slate-800 pb-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-700/50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-300">
          <Settings2 className="h-3.5 w-3.5" /> {t('구독 및 설정')}
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{t('플랜 & 사용량')}</h2>
        <p className="text-sm text-slate-400">{t('현재 플랜과 사용량을 확인하고 필요한 경우 업그레이드하세요.')}</p>
      </header>

      {isPastDue ? (
        <div
          id="spokedu-checkout-retry"
          className="flex flex-col gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/35 px-5 py-4 text-sm text-rose-50 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <p className="leading-relaxed">
              <span className="font-bold text-rose-100">{t('결제 지연')}</span>
              {t(' 상태입니다. 카드 정보를 확인하거나 아래에서 정기결제를 다시 시도해 주세요. 문제가 계속되면 ')}
              <a href="mailto:contact@spokedu.co.kr" className="font-bold text-rose-200 underline underline-offset-2">
                {t('이메일')}
              </a>
              {t('로 알려 주세요.')}
            </p>
          </div>
          {checkoutEnabled ? (
            <button
              type="button"
              onClick={() => document.getElementById('spokedu-stripe-checkout-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="min-h-[44px] shrink-0 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600"
            >
              {t('결제 다시 시도하기')}
            </button>
          ) : null}
        </div>
      ) : null}

      {isTrialing && ctx.billing.currentPeriodEndAt ? <TrialBanner trialEndAt={ctx.billing.currentPeriodEndAt} /> : null}

      <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/40 px-4 py-4 sm:px-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock label="플랜" value={t(PLAN_UI_META[currentPlan].label)} />
          <InfoBlock label="상태" value={statusLabel[ctx.entitlement.status] ?? ctx.entitlement.status} />
        </div>
        <div className="border-t border-slate-700/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('센터')}</p>
          <p className="mt-0.5 break-words text-sm leading-snug text-slate-200">
            {ctx.activeCenterId ? ctx.centers[0]?.name ?? t('내 센터') : t('연결된 센터 없음')}
          </p>
        </div>
        {ctx.billing.currentPeriodEndAt ? (
          <p className="text-xs leading-relaxed text-slate-500">
            {isTrialing ? t('체험 종료: ') : t('갱신일: ')}
            {new Date(ctx.billing.currentPeriodEndAt).toLocaleDateString('ko-KR')}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-4 text-sm leading-relaxed text-slate-200">
        <p className="mb-1 font-bold text-blue-200">{t('결제 안내')}</p>
        {checkoutEnabled ? (
          <p className="text-slate-300">
            {t('카드 정기결제로 바로 시작할 수 있습니다. 도입 과정에서 안내가 필요하면 이메일로 문의해 주세요.')}
            {' '}
            <a href="mailto:contact@spokedu.co.kr" className="font-bold text-blue-400 underline underline-offset-2">
              contact@spokedu.co.kr
            </a>
          </p>
        ) : (
          <>
            <p className="text-slate-300">
              {t('현재는 운영팀을 통해 수동으로 플랜 전환을 안내하고 있습니다. 도입을 원하시면 이메일로 문의해 주세요.')}
              {' '}
              <a href="mailto:contact@spokedu.co.kr" className="font-bold text-blue-400 underline underline-offset-2">
                contact@spokedu.co.kr
              </a>
            </p>
            <details className="mt-2 text-xs text-slate-500">
              <summary className="cursor-pointer font-bold text-slate-400 hover:text-slate-300">{t('결제 연동을 방금 켠 경우')}</summary>
              <p className="mt-2 border-l border-slate-600/80 pl-1">{t('아래 버튼으로 결제 버튼 표시 상태를 다시 불러오세요.')}</p>
            </details>
          </>
        )}

        {checkoutEnabled ? (
          <CheckoutActions
            checkoutLoading={checkoutLoading}
            portalLoading={portalLoading}
            hasStripeCustomer={!!ctx.billing.stripeCustomerId}
            onCheckout={handleStripeCheckout}
            onPortal={handleOpenBillingPortal}
            onRecheck={recheckCheckout}
          />
        ) : (
          <button
            type="button"
            onClick={() => void recheckCheckout()}
            className="mt-2 text-xs font-bold text-blue-400 underline underline-offset-2 hover:text-blue-300"
          >
            {t('결제 연동 상태 다시 불러오기')}
          </button>
        )}

        <p className="mt-3 text-xs text-slate-400">
          <Link href="/spokedu-pro/legal/subscription" className="font-bold text-blue-400 underline underline-offset-2">
            {t('구독·청약철회·환불 안내')}
          </Link>
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('이번 달 사용량')}</p>
        <UsageBar used={usage.classCount} limit={usage.classLimit} label="반" icon={LayoutGrid} colorClass="bg-emerald-500" />
        <div className="border-t border-slate-700/60" />
        <UsageBar
          used={usage.aiReportThisMonth}
          limit={usage.aiReportMonthlyLimit}
          label="AI 리포트"
          icon={Bot}
          colorClass="bg-violet-500"
          neutralZero={usage.aiReportMonthlyLimit === 0 && usage.aiReportThisMonth === 0}
          zeroHint={t('체험 계정에서는 리포트 기능 확인이 제한될 수 있습니다.')}
        />
      </div>

      {upgradeMsg ? (
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-300">
          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t(upgradeMsg)}</span>
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t('플랜 비교')}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} current={currentPlan} onUpgrade={handleUpgrade} upgrading={upgrading} />
          ))}
        </div>
      </div>

      {!ctx.activeCenterId ? (
        <TrialStartPanel
          bootstrapping={bootstrapping}
          bootstrapTrialGate={bootstrapTrialGate}
          onBootstrap={() => void handleBootstrap()}
          onDismissGate={() => setBootstrapTrialGate(false)}
        />
      ) : (
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/25 px-4 py-2.5 text-xs text-slate-500">
          {t('역할:')} <span className="font-medium text-slate-300">{ctx.role ?? 'owner'}</span>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 pt-2 text-sm text-slate-500">
        <Mail className="h-4 w-4" />
        {t('결제·기업 계약 문의:')}{' '}
        <a href="mailto:contact@spokedu.co.kr" className="font-medium text-blue-400 hover:underline">
          contact@spokedu.co.kr
        </a>
      </div>
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  const t = useTranslator();
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t(label)}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function CheckoutActions({
  checkoutLoading,
  portalLoading,
  hasStripeCustomer,
  onCheckout,
  onPortal,
  onRecheck,
}: {
  checkoutLoading: boolean;
  portalLoading: boolean;
  hasStripeCustomer: boolean;
  onCheckout: (plan: 'basic' | 'pro') => void;
  onPortal: () => void;
  onRecheck: () => void;
}) {
  const t = useTranslator();

  return (
    <div id="spokedu-stripe-checkout-actions" className="mt-3 flex scroll-mt-24 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <SubscriberButton tone="slate" size="sm" disabled={checkoutLoading} onClick={() => void onCheckout('basic')}>
          {checkoutLoading ? t('처리 중...') : t('Library 카드 정기결제')}
        </SubscriberButton>
        <SubscriberButton tone="slate" size="sm" disabled={checkoutLoading} onClick={() => void onCheckout('pro')}>
          {checkoutLoading ? t('처리 중...') : t('All-in-One 카드 정기결제')}
        </SubscriberButton>
      </div>
      <p className="text-xs text-slate-500">{t('결제 창이 열리지 않으면 같은 버튼을 한 번 더 누르거나 연동 상태를 다시 불러와 주세요.')}</p>
      <button type="button" onClick={() => void onRecheck()} className="self-start text-xs font-bold text-blue-400 underline underline-offset-2 hover:text-blue-300">
        {t('결제 연동 상태 다시 불러오기')}
      </button>
      {hasStripeCustomer ? (
        <div className="mt-2 border-t border-blue-500/20 pt-3">
          <p className="mb-2 text-xs text-slate-400">{t('카드 갱신, 청구 내역, 구독 변경은 고객 포털에서 확인할 수 있어요.')}</p>
          <SubscriberButton
            tone="blue"
            disabled={portalLoading || checkoutLoading}
            icon={portalLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 shrink-0" />}
            onClick={() => void onPortal()}
          >
            {portalLoading ? t('처리 중...') : t('카드·구독 관리 열기')}
          </SubscriberButton>
        </div>
      ) : null}
    </div>
  );
}

function TrialStartPanel({
  bootstrapping,
  bootstrapTrialGate,
  onBootstrap,
  onDismissGate,
}: {
  bootstrapping: boolean;
  bootstrapTrialGate: boolean;
  onBootstrap: () => void;
  onDismissGate: () => void;
}) {
  const t = useTranslator();

  return (
    <details className="rounded-xl border border-slate-700/60 bg-slate-900/30 px-4 py-3 text-sm text-slate-400">
      <summary className="cursor-pointer list-none font-bold text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
        {t('센터 연결·체험 시작')}
      </summary>
      <div className="mt-3 space-y-3 border-t border-slate-700/50 pt-3">
        <p className="text-xs leading-relaxed text-slate-500">
          {t('라이브러리와 SPOMOVE 수업 준비는 센터 기준으로 운영됩니다. 기관 단위로 쓰려면 먼저 센터를 연결해 주세요.')}
        </p>
        {bootstrapTrialGate ? (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
            <p className="leading-relaxed">
              {t('SPOKEDU PRO 체험은 베타 관리단 신청 후 운영팀 승인으로 제공됩니다. 아직 신청하지 않았다면 먼저 신청을 진행해 주세요. 이미 신청했다면 신청 이메일과 현재 로그인 이메일이 같은지 확인해 주세요.')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/pro/apply"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-center text-sm font-black text-white hover:bg-amber-500"
              >
                {t('베타 관리단 신청하기')}
              </Link>
              <button
                type="button"
                onClick={onDismissGate}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-bold text-amber-200 hover:bg-amber-950/40"
              >
                {t('다시 시도')}
              </button>
            </div>
          </div>
        ) : (
          <SubscriberButton
            tone="blue"
            size="sm"
            disabled={bootstrapping}
            icon={bootstrapping ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
            onClick={onBootstrap}
          >
            {bootstrapping ? t('생성 중...') : t('14일 프리미엄 체험 시작')}
          </SubscriberButton>
        )}
      </div>
    </details>
  );
}
