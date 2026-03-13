'use client';

import { useState } from 'react';
import {
  Settings2, CheckCircle, Zap, Crown, Building2, RefreshCw,
  Users, Bot, Mail, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useProContext, type Plan } from '../hooks/useProContext';

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
    description: '기본 기능을 무료로',
    features: [
      '로드맵 & 100대 프로그램 열람',
      '수업 보조도구 (팀 나누기, 술래 정하기)',
      '원생 등록 최대 10명',
    ],
    icon: Building2,
  },
  {
    id: 'basic',
    label: 'Basic',
    priceKrw: 49900,
    description: '소규모 센터 최적화',
    features: [
      'Free 기능 전체 포함',
      '원생 등록 최대 50명',
      'AI 에듀-에코 리포트 월 20회',
      '출결·신체 평가 CSV 내보내기',
    ],
    badge: 'Popular',
    badgeColor: 'bg-blue-500',
    icon: Zap,
  },
  {
    id: 'pro',
    label: 'Pro',
    priceKrw: 79900,
    description: '성장하는 센터를 위한 풀 패키지',
    features: [
      'Basic 기능 전체 포함',
      '원생 무제한 등록',
      'AI 리포트 무제한',
      '우선 지원 채널',
    ],
    badge: 'Best',
    badgeColor: 'bg-amber-500',
    icon: Crown,
  },
];

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
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min((used / limit!) * 100, 100);
  const isWarning = !isUnlimited && pct >= warningThreshold * 100;
  const isFull = !isUnlimited && used >= limit!;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Icon className="w-4 h-4 text-slate-400" />
          {label}
        </div>
        <span className={`font-bold tabular-nums ${isFull ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-300'}`}>
          {isUnlimited ? (
            <span className="text-emerald-400 text-xs font-bold">무제한</span>
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
          한도 초과 — 업그레이드가 필요합니다
        </p>
      )}
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
  onUpgrade: (p: Plan) => void;
  upgrading: boolean;
}) {
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
          {plan.badge}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${isCurrent ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className="text-base font-black text-white">{plan.label}</span>
          </div>
          <p className="text-xs text-slate-400">{plan.description}</p>
        </div>
        <div className="text-right shrink-0">
          {plan.priceKrw === 0 ? (
            <span className="text-xl font-black text-white">무료</span>
          ) : (
            <>
              <span className="text-xl font-black text-white">₩{plan.priceKrw.toLocaleString()}</span>
              <span className="text-xs text-slate-500 ml-0.5">/월</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-1.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-sm text-slate-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-bold">
          <CheckCircle className="w-3.5 h-3.5" />
          현재 플랜
        </div>
      ) : isUpgrade ? (
        <button
          type="button"
          disabled={upgrading}
          onClick={() => onUpgrade(plan.id)}
          className="flex items-center gap-1.5 justify-center py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
        >
          {upgrading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {plan.label}로 업그레이드
        </button>
      ) : (
        <div className="h-9" />
      )}
    </div>
  );
}

export default function SettingsView() {
  const { ctx, loading, refresh } = useProContext();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  const currentPlan = ctx.entitlement.plan;
  const { usage } = ctx;

  const handleUpgrade = async (plan: Plan) => {
    setUpgrading(true);
    setUpgradeMsg(null);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setUpgradeMsg(
        `${plan === 'basic' ? 'Basic' : 'Pro'} 업그레이드 신청을 원하시면 아래 이메일로 문의해 주세요.`
      );
    } finally {
      setUpgrading(false);
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
            ? `센터 "${data.centerName}"가 생성되었습니다.`
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
          <span>구독 정보 불러오는 중...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 lg:px-12 py-10 pb-32 space-y-8 max-w-4xl mx-auto">
      <header className="space-y-2 border-b border-slate-800 pb-7">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs font-bold uppercase tracking-widest">
          <Settings2 className="w-3.5 h-3.5" /> 구독 및 설정
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">플랜 & 사용량</h2>
        <p className="text-slate-400 text-sm">현재 플랜과 사용량을 확인하고 필요에 따라 업그레이드하세요.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-1.5">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">현재 센터</p>
          {ctx.activeCenterId ? (
            <>
              <p className="text-base font-bold text-white">{ctx.centers[0]?.name ?? '내 센터'}</p>
              <p className="text-xs text-slate-400">
                역할: <span className="text-slate-300 font-medium">{ctx.role ?? 'owner'}</span>
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">센터가 설정되지 않았습니다.</p>
              {ctx.dbReady ? (
                <button
                  type="button"
                  onClick={handleBootstrap}
                  disabled={bootstrapping}
                  className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {bootstrapping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {bootstrapping ? '생성 중...' : '내 센터 자동 생성'}
                </button>
              ) : (
                <p className="text-xs text-slate-500">DB 마이그레이션 후 활성화됩니다.</p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-1.5">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">현재 플랜</p>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white capitalize">{currentPlan}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              ctx.entitlement.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {ctx.entitlement.status === 'active' ? '활성' : ctx.entitlement.status}
            </span>
          </div>
          {ctx.billing.currentPeriodEndAt && (
            <p className="text-xs text-slate-400">
              갱신일: {new Date(ctx.billing.currentPeriodEndAt).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">이번 달 사용량</p>
        <UsageBar
          used={usage.studentCount}
          limit={usage.studentLimit}
          label="등록 원생"
          icon={Users}
          colorClass="bg-blue-500"
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

      {upgradeMsg && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
          <Mail className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{upgradeMsg}</span>
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">플랜 비교</p>
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

      {!ctx.dbReady && (
        <div className="px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm space-y-1">
          <p className="font-bold">구독 DB 마이그레이션 미적용</p>
          <p className="text-amber-400/80 text-xs leading-relaxed">
            Supabase에서{' '}
            <code className="bg-slate-800 px-1.5 py-0.5 rounded">20260308000000_spokedu_pro_commercial.sql</code>
            을 실행하고{' '}
            <code className="bg-slate-800 px-1.5 py-0.5 rounded">SPOKEDU_PRO_DB_READY=true</code>
            {' '}환경변수를 설정하면 구독 기능이 활성화됩니다.
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-2">
        <Mail className="w-4 h-4" />
        결제·기업 계약 문의:{' '}
        <a href="mailto:contact@spokedu.co.kr" className="text-blue-400 hover:underline font-medium">
          contact@spokedu.co.kr
        </a>
      </div>
    </section>
  );
}
