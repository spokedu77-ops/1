'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  buildMasterSubscriberValueView,
  hasMasterPreservedContext,
  hasMasterValueEvidence,
  type MasterActivationNeed,
  type MasterSubscriberValueEvidence,
} from '../../lib/masterSubscriberValueEvidence';
import { MASTER_VALUE_SUMMARY_INVALIDATED } from '../../lib/masterValueSummaryEvents';

const ACTIVATION: Record<Exclude<MasterActivationNeed, 'none'>, { label: string; href: string; description: string }> = {
  'create-class': { label: '첫 수업반 만들기', href: '/spokedu-master/classes', description: '수업반을 만들고 첫 일정을 연결해 보세요.' },
  'create-session': { label: '첫 수업 만들기', href: '/spokedu-master/activity', description: '수업반에 첫 수업 일정을 만들어 보세요.' },
  'prepare-session': { label: '수업 활동 추가', href: '/spokedu-master/activity', description: '예정된 수업에 오늘 진행할 활동을 담아 보세요.' },
  'run-first-session': { label: '첫 수업 열기', href: '/spokedu-master/activity', description: '준비한 수업을 열고 운영을 시작해 보세요.' },
};

export type MasterValueEvidenceSurface = 'home' | 'subscription' | 'preserved';

export function MasterValueEvidencePanel({
  plan,
  activation = 'none',
  retryVisible = false,
  preservedContext = false,
  surface = 'subscription',
}: {
  plan: 'free' | 'lite' | 'premium' | 'team';
  activation?: MasterActivationNeed;
  retryVisible?: boolean;
  preservedContext?: boolean;
  /** home: quiet secondary proof · subscription: billing companion · preserved: expired continuity */
  surface?: MasterValueEvidenceSurface;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [evidence, setEvidence] = useState<MasterSubscriberValueEvidence | null>(null);
  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/spokedu-master/value-summary', { cache: 'no-store' });
      if (!response.ok) throw new Error('load failed');
      const json = await response.json() as { data: MasterSubscriberValueEvidence };
      setEvidence(json.data);
      setStatus('ready');
    } catch {
      setEvidence(null);
      setStatus('error');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { void load(); };
    window.addEventListener(MASTER_VALUE_SUMMARY_INVALIDATED, refresh);
    return () => window.removeEventListener(MASTER_VALUE_SUMMARY_INVALIDATED, refresh);
  }, [load]);

  if (status === 'loading') {
    if (surface === 'home') return null;
    return <section aria-label="최근 운영 요약" className="h-24 animate-pulse rounded-2xl bg-slate-100" />;
  }
  if (status === 'error') {
    return retryVisible
      ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-600">최근 운영 요약을 불러오지 못했습니다.</p>
          <button type="button" onClick={() => void load()} className="mt-2 min-h-11 text-sm font-black text-emerald-700">다시 시도</button>
        </section>
      )
      : null;
  }
  if (!evidence) return null;

  if (preservedContext || surface === 'preserved') {
    if (!hasMasterPreservedContext(evidence)) return null;
    return (
      <section data-value-evidence="preserved" className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black text-slate-400">이전 운영</p>
        <h2 className="mt-1 text-base font-black text-slate-900">기존 운영 데이터가 그대로 있습니다</h2>
        <p className="mt-2 text-sm font-bold text-slate-600">수업반 {evidence.preserved.totalClasses}개 · 수업 {evidence.preserved.totalSessions}개</p>
        <Link href="/spokedu-master/payment" className="mt-3 inline-flex min-h-11 items-center text-sm font-black text-emerald-700">이전 운영 이어가기 →</Link>
      </section>
    );
  }

  if (!hasMasterValueEvidence(evidence)) {
    // Activation is not Home Value Evidence — avoid God-component onboarding on Work Home.
    if (surface === 'home' || activation === 'none') return null;
    const item = ACTIVATION[activation];
    return (
      <section data-value-evidence="activation" className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black text-slate-400">첫 운영</p>
        <p className="mt-1 text-sm font-bold text-slate-600">{item.description}</p>
        <Link href={item.href} className="mt-3 inline-flex min-h-11 items-center text-sm font-black text-emerald-700">{item.label} →</Link>
      </section>
    );
  }

  const view = buildMasterSubscriberValueView({ evidence, plan });
  if (!view.lines.length) return null;

  if (surface === 'home') {
    const primary = view.lines[0];
    const secondary = view.lines.slice(1, 3).map((line) => `${line.label} ${line.value}`).join(' · ');
    return (
      <section data-value-evidence="home" aria-label="운영 이어짐 참고" className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">이어짐</p>
        <p className="mt-1 text-[13px] font-bold text-slate-700">
          {primary.label} <span className="tabular-nums text-slate-900">{primary.value}</span>
          {secondary ? <span className="font-semibold text-slate-500"> · {secondary}</span> : null}
        </p>
        <Link href="/spokedu-master/subscription" className="mt-1 inline-flex min-h-9 items-center text-[11px] font-bold text-slate-500 hover:text-slate-800">
          구독에서 운영 환경 확인
        </Link>
      </section>
    );
  }

  return (
    <section data-value-evidence="subscription" aria-label="최근 운영이 이어진 사실" className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-400">유지 중인 운영</p>
      <h2 className="mt-1 text-base font-black text-slate-900">수업 운영이 이렇게 이어졌습니다</h2>
      <p className="mt-1 text-xs font-semibold text-slate-500">최근 30일 참고 · 사용량 평가가 아닙니다</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {view.lines.map((line) => (
          <div key={line.label} className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-bold text-slate-500">{line.label}</dt>
            <dd className={`mt-0.5 text-lg font-black ${line.kind === 'usage' ? 'text-slate-700' : 'text-slate-900'}`}>{line.value}</dd>
          </div>
        ))}
      </dl>
      {!evidence.memory.available && (plan === 'premium' || plan === 'team') ? (
        <p className="mt-2 text-xs font-semibold text-slate-400">기록 요약은 잠시 표시하지 못했습니다.</p>
      ) : null}
    </section>
  );
}
