'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, ClipboardList, FileText, Lock, MonitorPlay, Timer } from 'lucide-react';
import type { MasterCapability } from '../layout/masterRouteAccess';
import type { MasterAccessSnapshot } from '../../lib/masterAccessModel';

export type { MasterAccessSnapshot };

type SubscriptionGateWallProps = {
  requirement: Exclude<MasterCapability, 'authenticated'>;
  snapshot: MasterAccessSnapshot;
};

const FEATURE_COPY = {
  library: {
    icon: BookOpen,
    title: '이 기능을 사용하려면 이용권이 필요합니다',
    desc: '라이브러리와 전체 수업 자료는 활성 이용권에서 사용할 수 있습니다.',
  },
  classTools: {
    icon: Timer,
    title: '이 기능을 사용하려면 이용권이 필요합니다',
    desc: '수업 도구는 활성 이용권에서 사용할 수 있습니다.',
  },
  records: {
    icon: FileText,
    title: '이 기능을 사용하려면 이용권이 필요합니다',
    desc: '수업 기록, 안내문, 내 활동과 기록은 활성 이용권에서 사용할 수 있습니다.',
  },
  spomove: {
    icon: MonitorPlay,
    title: 'SPOMOVE는 프리미엄에서 이용할 수 있습니다',
    desc: '수업 중 프로젝터·TV·태블릿에 연결해 SPOMOVE 공식 활동을 큰 화면으로 바로 실행하려면 프리미엄이 필요합니다.',
  },
} as const;

export function SubscriptionGateWall({ requirement, snapshot }: SubscriptionGateWallProps) {
  const copy = FEATURE_COPY[requirement];
  const Icon = copy.icon;
  const hasBaseSubscriptionAccess = snapshot.canUseLibrary || snapshot.canUseClassTools || snapshot.canUseRecords;
  const subscriptionBlockedFeature = requirement === 'spomove' && hasBaseSubscriptionAccess && !snapshot.canUseSpomove;
  const primaryHref = subscriptionBlockedFeature ? '/spokedu-master/subscription' : '/spokedu-master/payment';
  const primaryLabel = subscriptionBlockedFeature ? '구독 관리' : '이용권 선택';

  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-[#f5f7fb] p-6">
      <section className="w-full max-w-[440px] rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-[18px] border border-red-200 bg-red-50">
          <Lock size={24} className="text-red-600" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600">
          {subscriptionBlockedFeature ? '프리미엄 필요' : '이용권 필요'}
        </p>
        <h2 className="mt-2 text-[27px] font-black leading-tight text-slate-950">
          {copy.title}
        </h2>
        <p className="mt-3 text-[14px] font-medium leading-6 text-slate-500">
          {copy.desc}
        </p>
        <div className="mt-5 rounded-[13px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-indigo-50">
              <Icon size={16} className="text-indigo-600" />
            </span>
            <div>
              <p className="text-[13px] font-black text-slate-900">필요한 접근 권한</p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
                {requirement === 'records'
                  ? '수업 기록 · 안내문 · 내 활동과 기록'
                  : requirement === 'classTools'
                    ? '수업 도구'
                    : requirement === 'library'
                      ? '라이브러리 · 전체 수업 자료'
                      : 'SPOMOVE 공식 활동 · 큰 화면 실행'}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-7 grid gap-2">
          <Link href={primaryHref} className="flex h-12 w-full items-center justify-center rounded-[12px] bg-indigo-600 text-[14px] font-black text-white shadow-lg shadow-indigo-200">
            {primaryLabel}
          </Link>
          {!subscriptionBlockedFeature ? (
            <Link href="/spokedu-master/dashboard" className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-slate-500">
              <ArrowLeft size={15} />
              홈으로
            </Link>
          ) : null}
        </div>
        {snapshot.cancelAtPeriodEnd && snapshot.currentPeriodEnd ? (
          <p className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-slate-500">
            <ClipboardList size={14} />
            해지 예정 이용권은 이용 종료일까지 사용할 수 있습니다.
          </p>
        ) : null}
      </section>
    </div>
  );
}
