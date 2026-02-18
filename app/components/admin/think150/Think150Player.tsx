'use client';

import { useEffect, useMemo } from 'react';
import {
  buildThink150Timeline,
  validateThinkPlan,
  preloadThinkPack,
  preloadThinkPackByWeek,
  preloadThinkPackByMonth,
  type Think150Config,
} from '@/app/lib/admin/engines/think150';
import { verifyThink150Timeline } from '@/app/lib/admin/engines/think150/think150Verify';
import { useThink150Playback } from '@/app/lib/admin/hooks/useThink150Playback';
import { Think150Viewer } from './Think150Viewer';
import { Think150ProgressBar } from './Think150ProgressBar';
import { Think150DebugOverlay } from './Think150DebugOverlay';

interface Think150PlayerProps {
  config: Think150Config;
  debug?: boolean;
}

export function Think150Player({ config, debug = false }: Think150PlayerProps) {
  const timeline = useMemo(() => buildThink150Timeline(config), [config]);
  const validation = useMemo(() => validateThinkPlan(timeline, config), [timeline, config]);
  const verifyReport = useMemo(() => verifyThink150Timeline(config), [config]);

  const { currentMs, event, playing, setPlaying, reset, totalMs: TOTAL_MS } = useThink150Playback(
    timeline,
    config,
    { initialPlaying: false }
  );
  const remainingSeconds = Math.max(0, Math.ceil((TOTAL_MS - currentMs) / 1000));

  const ruleLabel =
    event?.phase === 'rest3'
      ? null
      : event?.payload?.type === 'rest'
        ? (event.payload as { ruleLabel?: string }).ruleLabel
        : (event?.phase === 'stageC' || event?.phase === 'stageD') && event?.payload?.type === 'stageC'
          ? getStageCRuleLabel(
              event.payload as { week: number; slotCount?: number },
              event.phase
            )
          : null;

  useEffect(() => {
    if (config.thinkPackByMonthAndWeek && config.month != null) {
      preloadThinkPackByMonth(config.thinkPackByMonthAndWeek, config.month).catch(console.warn);
    } else if (config.thinkPackByWeek) {
      preloadThinkPackByWeek(config.thinkPackByWeek).catch(console.warn);
    } else if (config.thinkPack) {
      preloadThinkPack(config.thinkPack).catch(console.warn);
    }
  }, [config.thinkPack, config.thinkPackByWeek, config.thinkPackByMonthAndWeek, config.month]);

  return (
    <div className="space-y-3">
      <Think150ProgressBar currentMs={currentMs} totalMs={TOTAL_MS} />

      {ruleLabel && (
        <div className="rounded-lg bg-neutral-800 px-4 py-2 text-center text-sm font-medium text-neutral-200">
          {ruleLabel}
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-800" style={{ height: '50vh', minHeight: 320 }}>
        <Think150Viewer event={event} fullscreen={false} remainingSeconds={remainingSeconds} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
          onClick={() => setPlaying((p) => !p)}
          disabled={currentMs >= TOTAL_MS}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600"
          onClick={reset}
        >
          Reset
        </button>
      </div>

      {debug && (
        <Think150DebugOverlay
          result={validation}
          verifyReport={verifyReport}
          currentPhase={event?.phase}
          currentFrame={event?.frame}
        />
      )}
    </div>
  );
}

function getStageCRuleLabel(
  p: { week: number; slotCount?: number },
  phase?: 'stageC' | 'stageD'
): string {
  if (phase === 'stageD') {
    switch (p.week) {
      case 1:
        return '화면에 나온 두 가지 색을 가로로 밟으세요!';
      case 2:
        return '화면에 나온 색 세 개 순서를 기억했다가 빈 화면에서 밟으세요!';
      case 3:
        return '화면에 나온 색 두 개 순서를 기억했다가 빈 화면에서 밟으세요!';
      case 4:
        return '화면에 나온 색 세 개 순서를 기억했다가 빈 화면에서 밟으세요!';
      default:
        return '';
    }
  }
  switch (p.week) {
    case 1:
      return '화면에 나오는 색상을 피해서 밟으세요!';
    case 2:
      return '화면에 나온 동작을 따라 하세요! (박수/펀치/만세)';
    case 3:
      return '화면에 나온 두 가지 색을 밟으세요!';
    case 4:
      return '화면에 나온 색 순서를 기억했다가 빈 화면에서 밟으세요!';
    default:
      return '';
  }
}
