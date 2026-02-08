'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildThink150Timeline,
  preloadThinkPack,
  type Think150Config,
  type ThinkTimelineEvent,
} from '@/app/lib/admin/engines/think150';
import {
  initThink150Audio,
  scheduleThink150Sounds,
  startBGM,
  resumeAudioContext,
  suspendAudioContext,
} from '@/app/lib/admin/engines/think150/think150Audio';
import { MOCK_THINK_PACK } from '@/app/lib/admin/engines/think150/mockThinkPack';
import { useThinkBGM } from '@/app/lib/admin/hooks/useThinkBGM';
import { Think150Viewer } from '@/app/components/admin/think150/Think150Viewer';
import { Think150ProgressBar } from '@/app/components/admin/think150/Think150ProgressBar';
import { parseWeekKey } from '@/app/lib/admin/scheduler/dragAndDrop';

const TOTAL_MS = 150000;

function findCurrentEvent(events: ThinkTimelineEvent[], ms: number): ThinkTimelineEvent | null {
  if (ms >= TOTAL_MS && events.length > 0) {
    return events[events.length - 1]!;
  }
  return events.find((e) => ms >= e.t0 && ms < e.t1) ?? null;
}

export interface ThinkPhaseWrapperProps {
  weekKey: string;
  onEnd: () => void;
  /** 스케줄러에서 퍼블리시된 Think 설정 (week, month, audience) */
  scheduleSnapshot?: { think150?: boolean; week?: number; month?: number; audience?: string } | null;
}

export function ThinkPhaseWrapper({ weekKey, onEnd, scheduleSnapshot }: ThinkPhaseWrapperProps) {
  const parsed = parseWeekKey(weekKey);
  const weekFromKey = (parsed?.week ?? 1) as 1 | 2 | 3 | 4;
  const week = (scheduleSnapshot?.week != null ? scheduleSnapshot.week : weekFromKey) as 1 | 2 | 3 | 4;
  const audience = (scheduleSnapshot?.audience as Think150Config['audience']) ?? 'elementary';
  const month = scheduleSnapshot?.month;
  const { selected: bgmPath } = useThinkBGM();
  const [seed] = useState(() => Date.now());

  const config = useMemo<Think150Config>(
    () => ({
      audience,
      week,
      ...(month != null && { month }),
      seed,
      thinkPack: MOCK_THINK_PACK,
      bgmPath: bgmPath || undefined,
    }),
    [audience, week, month, bgmPath, seed]
  );

  const timeline = useMemo(() => buildThink150Timeline(config), [config]);
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [started] = useState(true);
  void started;
  const rafRef = useRef<number>(0);
  const startMsRef = useRef(0);
  const startTMsRef = useRef(0);

  const event = findCurrentEvent(timeline, currentMs);

  useEffect(() => {
    preloadThinkPack(config.thinkPack!).catch(console.warn);
  }, [config.thinkPack]);

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
      if (clamped >= TOTAL_MS) {
        setPlaying(false);
        onEnd();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      suspendAudioContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentMs is set inside tick; adding it would cause loop
  }, [playing, timeline, config.bgmPath, onEnd]);

  const handleStart = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <div className="z-10 shrink-0 border-b border-neutral-800 bg-black/80 px-4 py-3 backdrop-blur-sm">
        <Think150ProgressBar currentMs={currentMs} totalMs={TOTAL_MS} />
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col"
        onClick={handleStart}
        onKeyDown={(e) => e.key === ' ' && handleStart()}
        role="button"
        tabIndex={0}
      >
        <Think150Viewer event={started ? event : null} fullscreen />
      </div>
    </div>
  );
}
