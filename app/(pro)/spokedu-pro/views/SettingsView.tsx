'use client';

import { useState, useEffect } from 'react';
import { Settings2, CheckCircle, Zap, Crown, Building2, RefreshCw, Sparkles, X, AlertTriangle } from 'lucide-react';
import { useProContext, type Plan } from '../hooks/useProContext';

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

// ── 취소 확인 모달 ────────────────────────────────────────────────────────────
function CancelModal({
  onConfirm,
  onClose,
  canceling,
}: {
  onConfirm: () => void;
  onClose: () => void;
  canceling: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-bold">구독을 취소하시겠습니까?</p>
            <p className="text-slate-400 text-sm mt-1">
              취소 후 현재 결제 주기가 끝나면 Free 플랜으로 전환됩니다.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={canceling}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            돌아가기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={canceling}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canceling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            {canceling ? '처리 중...' : '취소 확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 플랜 카드 ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  current,
  onUpgrade,
  upgrading,
  dbReady,
}: {
  plan: PlanDef;
  current: Plan;
  onUpgrade: (p: Plan) => Promise<void>;
  upgrading: boolean;
  dbReady: boolean;
}) {
  const isCurrent = plan.id === current;
  const isUpgrade = plan.id !== 'free' && plan.id !== current;
  const Icon = plan.icon;
  const isDisabled = upgrading || !dbReady;

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
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => onUpgrade(plan.id)}
            title={!dbReady ? 'DB 준비 완료 후 업그레이드 가능합니다' : undefined}
            className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            {upgrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {plan.label}로 업그레이드
          </button>
          {!dbReady && (
            <p className="text-xs text-center text-amber-400/70">DB 준비 완료 후 업그레이드 가능합니다</p>
          )}
        </div>
      ) : (
        <div className="h-10" />
      )}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function SettingsView() {
  const { ctx, loading, refresh } = useProContext();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const currentPlan = ctx.entitlement.plan;

  // 메시지 5초 후 자동 소멸
  useEffect(() => {
    if (!upgradeMsg) return;
    const t = setTimeout(() => setUpgradeMsg(null), 5000);
    return () => clearTimeout(t);
  }, [upgradeMsg]);

  const handleUpgrade = async (plan: Plan) => {
    if (!ctx.dbReady) return;
    setUpgrading(true);
    setUpgradeMsg(null);
    try {
      const res = await fetch('/api/spokedu-pro/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.reason === 'stripe_not_configured' || data.reason === 'price_not_configured') {
        setUpgradeMsg(
          `${plan === 'basic' ? 'Basic' : 'Pro'} 업그레이드는 곧 결제 시스템이 연결될 예정입니다. 구독 신청을 원하시면 운영팀에 문의해주세요.`
        );
      } else {
        setUpgradeMsg(data.message ?? data.error ?? '업그레이드를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch {
      setUpgradeMsg('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
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
        setUpgradeMsg(data.bootstrapped ? `센터 "${data.centerName}"가 생성되었습니다.` : '이미 센터가 설정되어 있습니다.');
      } else {
        setUpgradeMsg('센터 생성에 실패했습니다: ' + (data.error ?? '알 수 없는 오류'));
      }
    } catch {
      setUpgradeMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setBootstrapping(false);
    }
  };

  const handleCancelConfirm = async () => {
    setCanceling(true);
    try {
      const res = await fetch('/api/spokedu-pro/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await refresh();
        setUpgradeMsg('구독이 취소되었습니다. 현재 결제 주기 종료 후 Free 플랜으로 전환됩니다.');
      } else {
        setUpgradeMsg('구독 취소에 실패했습니다. 운영팀에 문의해주세요.');
      }
    } catch {
      setUpgradeMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setCanceling(false);
      setShowCancelModal(false);
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
    <section className="px-6 lg:px-12 py-10 pb-32 space-y-10 max-w-4xl mx-auto">
      {/* 취소 모달 */}
      {showCancelModal && (
        <CancelModal
          onConfirm={handleCancelConfirm}
          onClose={() => !canceling && setShowCancelModal(false)}
          canceling={canceling}
        />
      )}

      {/* 헤더 */}
      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs font-bold uppercase tracking-widest">
          <Settings2 className="w-4 h-4" /> 구독 및 설정
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">플랜 & 결제</h2>
        <p className="text-slate-400 font-medium">
          현재 플랜을 확인하고 필요에 따라 업그레이드하세요.
        </p>
      </header>

      {/* 현재 센터 상태 */}
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

        <div className="flex-1 min-w-[220px] p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-1">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">현재 플랜</p>
          <p className="text-lg font-bold text-white capitalize">{currentPlan}</p>
          <p className="text-xs text-slate-400">
            상태:{' '}
            <span className={ctx.entitlement.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>
              {ctx.entitlement.status}
            </span>
          </p>
          {ctx.billing.currentPeriodEndAt && (
            <p className="text-xs text-slate-400">
              갱신일: {new Date(ctx.billing.currentPeriodEndAt).toLocaleDateString('ko-KR')}
            </p>
          )}
          {ctx.dbReady && currentPlan !== 'free' && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="mt-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              구독 취소
            </button>
          )}
        </div>
      </div>

      {/* 업그레이드 메시지 */}
      {upgradeMsg && (
        <div className="px-5 py-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
          {upgradeMsg}
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
            dbReady={ctx.dbReady}
          />
        ))}
      </div>

      {/* DB 미준비 안내 */}
      {!ctx.dbReady && (
        <div className="px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm space-y-1">
          <p className="font-bold">구독 DB 마이그레이션 미적용</p>
          <p className="text-amber-400/80">
            Supabase에서 <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">20260308000000_spokedu_pro_commercial.sql</code>을
            실행하고 <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">SPOKEDU_PRO_DB_READY=true</code> 환경변수를 설정하면 구독 기능이 활성화됩니다.
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
  );
}
