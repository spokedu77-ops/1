'use client';

import { BookOpen, CalendarDays, CreditCard, FileText, Gamepad2, Sparkles } from 'lucide-react';
import type { ViewId } from '../hooks/useSpokeduProUI';
import { SubscriberActionTile } from './SubscriberWorkspacePrimitives';

export default function SubscriberWorkspaceBar({
  activeView,
  plan,
  status,
  programCount,
  programLibraryReady,
  onGoToday,
  onGoPlan,
  onGoLibrary,
  onGoSpomove,
  onGoReport,
  onGoBilling,
}: {
  activeView: ViewId;
  plan: string;
  status: string;
  programCount: number;
  programLibraryReady: boolean;
  onGoToday: () => void;
  onGoPlan: () => void;
  onGoLibrary: () => void;
  onGoSpomove: () => void;
  onGoReport: () => void;
  onGoBilling: () => void;
}) {
  const items = [
    {
      id: 'today',
      label: '오늘 수업',
      caption: '대시보드',
      meta: '바로 시작',
      icon: CalendarDays,
      tone: 'cyan' as const,
      active: activeView === 'roadmap',
      onClick: onGoToday,
    },
    {
      id: 'library',
      label: '수업안',
      caption: '라이브러리',
      meta: programLibraryReady ? `${programCount}개` : '불러오는 중',
      icon: BookOpen,
      tone: 'emerald' as const,
      active: activeView === 'library',
      onClick: onGoLibrary,
    },
    {
      id: 'spomove',
      label: 'SPOMOVE',
      caption: '반응훈련',
      meta: '인지/반응',
      icon: Gamepad2,
      tone: 'cyan' as const,
      active: activeView === 'library',
      onClick: onGoSpomove,
    },
    {
      id: 'plan',
      label: '수업 계획',
      caption: '주간 준비',
      meta: '플랜 보드',
      icon: Sparkles,
      tone: 'violet' as const,
      active: activeView === 'lesson-plan',
      onClick: onGoPlan,
    },
    {
      id: 'report',
      label: '리포트',
      caption: '학부모 공유',
      meta: 'AI 작성',
      icon: FileText,
      tone: 'violet' as const,
      active: activeView === 'ai',
      onClick: onGoReport,
    },
  ];

  return (
    <section className="relative z-[12] border-b border-slate-800/70 bg-slate-950/72 px-4 py-3 backdrop-blur-xl md:px-6 lg:px-10">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">Subscriber Workspace</p>
          <h2 className="mt-1 truncate text-lg font-black tracking-tight text-white">수업 준비부터 공유까지 한 줄로 이어갑니다.</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          {items.map(({ id, label, caption, meta, icon, tone, active, onClick }) => (
            <SubscriberActionTile
              key={id}
              label={label}
              caption={caption}
              meta={meta}
              icon={icon}
              tone={tone}
              active={active}
              compact
              onClick={onClick}
            />
          ))}
          <SubscriberActionTile
            label="구독 상태"
            caption={String(plan).toUpperCase()}
            meta={status}
            icon={CreditCard}
            tone="emerald"
            active={activeView === 'settings'}
            compact
            onClick={onGoBilling}
          />
        </div>
      </div>
    </section>
  );
}
