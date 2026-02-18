'use client';

import type { ThinkTimelineEvent } from '@/app/lib/admin/engines/think150';
import { PAD_COLORS } from '@/app/lib/admin/constants/padGrid';
import { StageAQuad } from './StageAQuad';
import { StageBFull } from './StageBFull';
import { StageCMultiPanel } from './StageCMultiPanel';

interface Think150ViewerProps {
  event: ThinkTimelineEvent | null;
  /** true = 구독자 전체화면, false = admin 미리보기 */
  fullscreen?: boolean;
  /** 남은 초 (카운트다운 표시, 글자와 겹치지 않음) */
  remainingSeconds?: number;
}

export function Think150Viewer({ event, fullscreen = false, remainingSeconds }: Think150ViewerProps) {
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
      const p = event.payload as { type: 'intro'; subtitle?: string } | undefined;
      const subtitle = p?.subtitle;
      return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-8 text-center">
          <h1 className="text-5xl font-black tracking-tight text-cyan-400 md:text-6xl">THINK</h1>
          <p className="mt-4 text-xl text-neutral-400">생각하기</p>
          {subtitle ? (
            <p className="mt-3 max-w-md text-base text-neutral-500 md:text-lg">{subtitle}</p>
          ) : null}
        </div>
      );
    }

    if (event.phase === 'ready') {
      const p = event.payload as { type: 'ready'; count: 3 | 2 | 1; stageIntro?: string } | undefined;
      const count = p?.count ?? 3;
      const stageIntro = p?.stageIntro;
      return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-4 bg-neutral-950 px-4">
          {stageIntro ? (
            <p className="max-w-lg text-center text-lg font-medium text-neutral-300 md:text-xl">
              {stageIntro}
            </p>
          ) : null}
          <span className="text-8xl font-black tabular-nums text-white md:text-9xl">{count}</span>
        </div>
      );
    }

    if (event.phase === 'stageA' && event.payload?.type === 'stageA') {
      const p = event.payload;
      const week = p.week ?? 0;
      const isImageWeek = week === 3 || week === 4;
      const isBlank = event.frame === 'blank' || event.frame === 'hold';
      const useWhiteBg = !isImageWeek && event.frame === 'cue' && !!p.imageUrl;
      return (
        <div className={`h-full min-h-[240px] w-full flex-1 ${useWhiteBg ? 'bg-white' : isImageWeek && isBlank ? 'bg-black' : ''}`}>
          <StageAQuad
            activeColor={event.frame === 'cue' ? p.color : null}
            imageUrl={p.imageUrl}
            frame={event.frame}
            week={week >= 1 && week <= 4 ? (week as 1 | 2 | 3 | 4) : undefined}
          />
        </div>
      );
    }

    if (event.phase === 'stageB' && event.payload?.type === 'stageB') {
      const p = event.payload;
      const isBlank = event.frame === 'blank' || event.frame === 'hold';
      const useWhiteBg = isBlank || (event.frame === 'cue' && !!p.imageUrl);
      return (
        <div className={`h-full min-h-[240px] w-full flex-1 ${useWhiteBg ? 'bg-white' : ''}`}>
          <StageBFull
            color={event.frame === 'cue' ? p.color : null}
            imageUrl={p.imageUrl}
            frame={event.frame}
            week={p.week}
          />
        </div>
      );
    }

    if ((event.phase === 'stageC' || event.phase === 'stageD') && event.payload?.type === 'stageC') {
      const p = event.payload;
      if (p.actionMission) {
        if (event.frame === 'blank' || event.frame === 'hold') {
          return (
            <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-neutral-950" />
          );
        }
        const labels: Record<string, { kor: string; en: string; emoji: string }> = {
          clap: { kor: '박수', en: 'CLAP', emoji: '👏' },
          punch: { kor: '펀치', en: 'PUNCH', emoji: '👊' },
          hurray: { kor: '만세', en: 'HURRAY', emoji: '🙌' },
        };
        const { kor, en, emoji } = labels[p.actionMission] ?? { kor: '', en: '', emoji: '' };
        const color = p.slotColors?.[0];
        const hex = color ? PAD_COLORS[color] : undefined;
        return (
          <div
            className="flex h-full w-full flex-1 flex-col items-center justify-center"
            style={hex ? { backgroundColor: hex } : undefined}
          >
            <div className="flex flex-col items-center justify-center rounded-2xl bg-black/40 px-8 py-6 shadow-lg">
              <span className="text-5xl md:text-7xl" aria-hidden>{emoji}</span>
              <p className="mt-2 text-3xl font-black text-white md:text-5xl">{en}</p>
              <p className="mt-1 text-xl font-bold text-white/90 md:text-2xl">{kor}</p>
            </div>
          </div>
        );
      }
      const hasImages = p.images?.some((u) => !!u?.length);
      const isBlank = event.frame === 'blank' || event.frame === 'hold';
      const useWhiteBg = (event.frame === 'cue' && !!hasImages) || isBlank;
      const content = (
        <StageCMultiPanel
          slotCount={p.slotCount}
          slotColors={p.slotColors}
          images={p.images}
          frame={event.frame}
          layout={p.layout}
          sameColor={p.week === 1 && p.slotCount > 1}
          week={p.week}
        />
      );
      if (p.antiLabel && event.phase === 'stageC') {
        return (
          <div className={`flex h-full min-h-[240px] w-full flex-1 flex-col ${useWhiteBg ? 'bg-white' : ''}`}>
            <div className="shrink-0 py-2 text-center text-lg font-bold text-amber-400">{p.antiLabel}</div>
            <div className="min-h-0 flex-1">{content}</div>
          </div>
        );
      }
      return (
        <div className={`h-full min-h-[240px] w-full flex-1 ${useWhiteBg ? 'bg-white' : ''}`}>
          {content}
        </div>
      );
    }

    if (event.phase.startsWith('rest') && event.payload?.type === 'rest') {
      const p = event.payload;
      const displayText = p.ruleLabel;
      return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-8">
          <div className="max-w-lg rounded-2xl border border-neutral-700 bg-neutral-800/50 px-8 py-6 text-center">
            <p className="text-xl font-semibold leading-relaxed text-neutral-100 md:text-2xl">
              {displayText}
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
      {remainingSeconds != null && (
        <div
          className="absolute right-4 top-4 z-10 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-xl font-bold tabular-nums text-white"
          aria-label={`${remainingSeconds}초 남음`}
        >
          {remainingSeconds}s
        </div>
      )}
      <div className={contentWrapperClass}>
        {renderContent()}
      </div>
    </div>
  );
}
