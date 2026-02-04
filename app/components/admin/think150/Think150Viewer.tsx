'use client';

import type { ThinkTimelineEvent } from '@/app/lib/admin/engines/think150';
import { StageAQuad } from './StageAQuad';
import { StageBFull } from './StageBFull';
import { StageCMultiPanel } from './StageCMultiPanel';

interface Think150ViewerProps {
  event: ThinkTimelineEvent | null;
  /** true = 구독자 전체화면, false = admin 미리보기 */
  fullscreen?: boolean;
}

export function Think150Viewer({ event, fullscreen = false }: Think150ViewerProps) {
  const containerClass = fullscreen
    ? 'fixed inset-0 z-0 flex h-screen w-screen items-stretch justify-stretch overflow-hidden'
    : 'relative flex h-[50vh] min-h-[320px] w-full items-stretch justify-stretch overflow-hidden rounded-xl';

  const contentWrapperClass = fullscreen
    ? 'flex h-full w-full flex-1 min-h-0'
    : 'flex h-full min-h-[320px] w-full flex-1';

  const renderContent = () => {
    if (!event) {
      return (
        <div className="flex h-full min-h-[240px] w-full flex-1 items-center justify-center bg-neutral-900 text-neutral-500">
          <p className="text-lg">화면을 눌러 시작하세요</p>
        </div>
      );
    }

    if (event.phase === 'intro') {
      const p = event.payload as { type: 'intro'; week: number; subtitle?: string } | undefined;
      const subtitle = p?.subtitle;
      return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-8 text-center">
          <h1 className="text-5xl font-black tracking-tight text-cyan-400 md:text-6xl">THINK</h1>
          <p className="mt-4 text-xl text-neutral-400">생각하기</p>
          {subtitle && (
            <p className="mt-6 max-w-md rounded-2xl bg-cyan-500/10 px-6 py-4 text-base font-medium text-cyan-300">
              {subtitle}
            </p>
          )}
        </div>
      );
    }

    if (event.phase === 'ready') {
      const p = event.payload as { type: 'ready'; count: 3 | 2 | 1 } | undefined;
      const count = p?.count ?? 3;
      return (
        <div className="flex h-full w-full flex-1 items-center justify-center bg-neutral-950">
          <span className="text-8xl font-black tabular-nums text-white md:text-9xl">{count}</span>
        </div>
      );
    }

    if (event.phase === 'stageA' && event.payload?.type === 'stageA') {
      const p = event.payload;
      return (
        <div className="h-full min-h-[240px] w-full flex-1">
          <StageAQuad
          activeColor={event.frame === 'cue' ? p.color : null}
          imageUrl={p.imageUrl}
          frame={event.frame}
          />
        </div>
      );
    }

    if (event.phase === 'stageB' && event.payload?.type === 'stageB') {
      const p = event.payload;
      return (
        <div className="h-full min-h-[240px] w-full flex-1">
          <StageBFull
            color={event.frame === 'cue' ? p.color : null}
            imageUrl={p.imageUrl}
            frame={event.frame}
          />
        </div>
      );
    }

    if (event.phase === 'stageC' && event.payload?.type === 'stageC') {
      const p = event.payload;
      return (
        <div className="h-full min-h-[240px] w-full flex-1">
          <StageCMultiPanel
            slotCount={p.slotCount}
            slotColors={p.slotColors}
            images={p.images}
            frame={event.frame}
            layout={p.layout}
            sameColor={p.week === 1 && p.slotCount > 1}
          />
        </div>
      );
    }

    if (event.phase.startsWith('rest') && event.payload?.type === 'rest') {
      const p = event.payload;
      return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-8">
          <div className="max-w-lg rounded-2xl border border-neutral-700 bg-neutral-800/50 px-8 py-6 text-center">
            <p className="text-xl font-semibold leading-relaxed text-neutral-100 md:text-2xl">
              {p.ruleLabel}
            </p>
          </div>
        </div>
      );
    }

    if (event.phase === 'outro' && event.payload?.type === 'outro') {
      const p = event.payload;
      return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-8 text-center">
          <p className="max-w-md text-2xl font-medium leading-relaxed text-neutral-200 md:text-3xl">
            {p.summaryText}
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-neutral-950 text-neutral-500">
        {event.phase}
      </div>
    );
  };

  return (
    <div className={containerClass}>
      <div className={contentWrapperClass}>
        {renderContent()}
      </div>
    </div>
  );
}
