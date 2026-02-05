'use client';

/**
 * RuntimePlayer - 유일한 state owner
 * tMs, playing, speed. tick edge 기반 audio dispatch (중복 방지)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAY_RULES } from '@/app/lib/constants/rules';
import type { PlayTimeline, AudioEvent } from '@/app/lib/engine/play/types';
import { PlayRenderer } from './PlayRenderer';
import { PlayTestDebugOverlay } from './PlayTestDebugOverlay';

const TICK_MS = PLAY_RULES.TICK_MS;

export interface RuntimePlayerProps {
  timeline: PlayTimeline;
  /** tick edge에서 audio 이벤트 디스패치 (중복 방지) */
  onAudioEvent?: (event: AudioEvent) => void;
  /** 타임라인 종료 시 콜백 */
  onEnd?: () => void;
  /** 디버그 오버레이 표시 (tick/phase/step) */
  debug?: boolean;
  /** 마운트 시 자동 재생 (구독자 전체 플로우용) */
  autoPlay?: boolean;
}

export function RuntimePlayer({ timeline, onAudioEvent, onEnd, debug, autoPlay }: RuntimePlayerProps) {
  const [tMs, setTMs] = useState(0);
  const [playing, setPlaying] = useState(!!autoPlay);
  const [speed] = useState(1);
  const lastProcessedTickRef = useRef<number>(-1);
  const onEndCalledRef = useRef(false);
  const rafRef = useRef<number>(0);
  const startMsRef = useRef(0);
  const startTMsRef = useRef(0);
  const tMsRef = useRef(tMs);
  useEffect(() => {
    tMsRef.current = tMs;
  }, [tMs]);

  const seek = useCallback((ms?: number) => {
    if (ms !== undefined) {
      setTMs(Math.max(0, Math.min(ms, (timeline.totalTicks - 1) * TICK_MS)));
    }
  }, [timeline.totalTicks]);

  useEffect(() => {
    if (!playing) return;
    onEndCalledRef.current = false;
    startMsRef.current = performance.now();
    startTMsRef.current = tMsRef.current;

    const tick = () => {
      const elapsed = (performance.now() - startMsRef.current) * speed;
      const newTMs = startTMsRef.current + elapsed;
      const maxTMs = (timeline.totalTicks - 1) * TICK_MS;
      const clamped = Math.min(newTMs, maxTMs);
      setTMs(clamped);

      if (clamped >= maxTMs) {
        setPlaying(false);
        if (!onEndCalledRef.current) {
          onEndCalledRef.current = true;
          onEnd?.();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, timeline.totalTicks, onEnd]);

  useEffect(() => {
    const currentTick = Math.floor(tMs / TICK_MS);
    if (currentTick === lastProcessedTickRef.current) return;
    lastProcessedTickRef.current = currentTick;

    const eventsAtTick = timeline.audio.filter((e) => e.tick === currentTick);
    for (const ev of eventsAtTick) {
      onAudioEvent?.(ev);
    }
  }, [tMs, timeline.audio, onAudioEvent]);

  return (
    <div data-runtime-player className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <PlayRenderer tMs={tMs} visuals={timeline.visuals} totalTicks={timeline.totalTicks} />
      </div>
      {debug && <PlayTestDebugOverlay tMs={tMs} timeline={timeline} />}
      {!autoPlay && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-neutral-700 px-3 py-2 text-sm hover:bg-neutral-600"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="rounded-lg bg-neutral-700 px-3 py-2 text-sm hover:bg-neutral-600"
            onClick={() => seek(0)}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
