'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildThink150Timeline,
  validateThinkPlan,
  preloadThinkPack,
  preloadThinkPackByWeek,
  preloadThinkPackByMonth,
  type Think150Config,
  type ThinkTimelineEvent,
} from '@/app/lib/admin/engines/think150';
import { verifyThink150Timeline } from '@/app/lib/admin/engines/think150/think150Verify';
import {
  initThink150Audio,
  scheduleThink150Sounds,
  resumeAudioContext,
  suspendAudioContext,
  startBGM,
} from '@/app/lib/admin/engines/think150/think150Audio';
import { Think150Viewer } from './Think150Viewer';
import { Think150ProgressBar } from './Think150ProgressBar';
import { Think150DebugOverlay } from './Think150DebugOverlay';

const TOTAL_MS = 150000;

function findCurrentEvent(events: ThinkTimelineEvent[], ms: number): ThinkTimelineEvent | null {
  if (ms >= 150000 && events.length > 0) {
    return events[events.length - 1]!;
  }
  return events.find((e) => ms >= e.t0 && ms < e.t1) ?? null;
}

interface Think150PlayerProps {
  config: Think150Config;
  debug?: boolean;
}

export function Think150Player({ config, debug = false }: Think150PlayerProps) {
  const timeline = useMemo(() => buildThink150Timeline(config), [config]);
  const validation = useMemo(() => validateThinkPlan(timeline, config), [timeline, config]);
  const verifyReport = useMemo(() => verifyThink150Timeline(config), [config]);

  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const startMsRef = useRef(0);
  const startTMsRef = useRef(0);

  const event = findCurrentEvent(timeline, currentMs);
  const ruleLabel =
    event?.payload?.type === 'rest'
      ? (event.payload as { ruleLabel?: string }).ruleLabel
      : event?.phase === 'stageC' && event?.payload?.type === 'stageC'
        ? getStageCRuleLabel(event.payload as { week: number; slotCount?: number })
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

  useEffect(() => {
    if (!playing) return;
    const startAtMs = currentMs;
    startMsRef.current = performance.now();
    startTMsRef.current = startAtMs;

    resumeAudioContext();
    initThink150Audio().then(() => {
      scheduleThink150Sounds(timeline, startAtMs, startAtMs);
      if (config.bgmPath) {
        startBGM(config.bgmPath, startAtMs, TOTAL_MS - startAtMs).catch(() => {});
      }
    });

    const tick = () => {
      const elapsed = performance.now() - startMsRef.current;
      const newMs = startTMsRef.current + elapsed;
      const clamped = Math.min(newMs, TOTAL_MS);
      setCurrentMs(clamped);
      if (clamped >= TOTAL_MS) setPlaying(false);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      suspendAudioContext();
    };
  }, [playing, timeline, config.bgmPath]);

  const reset = useCallback(() => {
    setPlaying(false);
    setCurrentMs(0);
  }, []);

  return (
    <div className="space-y-3">
      <Think150ProgressBar currentMs={currentMs} totalMs={TOTAL_MS} />

      {ruleLabel && (
        <div className="rounded-lg bg-neutral-800 px-4 py-2 text-center text-sm font-medium text-neutral-200">
          {ruleLabel}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-800" style={{ height: '50vh', minHeight: 320 }}>
        <Think150Viewer event={event} fullscreen={false} />
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

function getStageCRuleLabel(p: { week: number; slotCount?: number }): string {
  switch (p.week) {
    case 1:
      return '화면에 같은 색이 여러 개 보이면, 그 색의 패드에서 보이는 개수만큼 양발로 점프해 주세요.';
    case 2:
      return '화면에 서로 다른 색 두 개가 보이면, 왼쪽 색은 왼발, 오른쪽 색은 오른발로 동시에 착지해 주세요.';
    case 3:
      return 'ANTI! 보이는 색의 대각선에 있는 색으로 이동해 주세요. (빨강↔파랑, 초록↔노랑)';
    case 4:
      return '화면에 보여주는 색의 순서를 기억했다가, 빈 화면에서 같은 순서대로 이동해 주세요.';
    default:
      return '';
  }
}
