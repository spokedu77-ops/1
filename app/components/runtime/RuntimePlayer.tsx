'use client';

/**
 * RuntimePlayer - Tick Clock (snapToTick) 또는 rAF 연속재생
 * snapToTick=true: tickIndex를 source-of-truth로, "목표 시각 = play 시작 + tickIndex*500" 기준
 *   setTimeout으로 다음 tick을 스케줄해 setInterval 누적 drift 제거 (block 4/5 타이밍 유지)
 * snapToTick=false: 기존 rAF 기반 연속 재생
 */

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { PLAY_RULES } from '@/app/lib/constants/rules';
import type { PlayTimeline, AudioEvent } from '@/app/lib/engine/play/types';
import { PlayRenderer } from './PlayRenderer';
import { PlayTestDebugOverlay } from './PlayTestDebugOverlay';

/** 1 tick = 500ms 고정. 오차 없이 목표 시각(playStart + tickIndex*500) 기준으로만 스케줄 */
const TICK_MS = PLAY_RULES.TICK_MS;
const TICK_MS_STRICT = 500;

export interface RuntimePlayerRef {
  play: () => void;
  pause: () => void;
  reset: () => void;
  isPlaying: () => boolean;
}

export interface RuntimePlayerProps {
  timeline: PlayTimeline;
  onAudioEvent?: (event: AudioEvent) => void;
  onEnd?: () => void;
  debug?: boolean;
  autoPlay?: boolean;
  snapToTick?: boolean;
  hideControls?: boolean;
}

export const RuntimePlayer = forwardRef<RuntimePlayerRef, RuntimePlayerProps>(function RuntimePlayer(
  { timeline, onAudioEvent, onEnd, debug, autoPlay, snapToTick = true, hideControls = false },
  ref
) {
  const totalTicks = timeline.totalTicks;
  const maxTick = Math.max(0, totalTicks - 1);

  // Tick Clock 경로: tickIndex가 source-of-truth
  const [tickIndex, setTickIndex] = useState(0);
  const [playing, setPlaying] = useState(!!autoPlay);
  const [lastDeltaMs, setLastDeltaMs] = useState<number | null>(null);

  // rAF 경로 (snapToTick=false 시)
  const [tMsRaf, setTMsRaf] = useState(0);
  const [speed] = useState(1);
  const rafRef = useRef<number>(0);
  const startMsRef = useRef(0);
  const startTMsRef = useRef(0);

  const tickIndexRef = useRef(tickIndex);
  const lastTickTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Tick Clock: 재생 시작 시각. 목표 시각 = playStartMs + tickIndex*500 (오차 없음) */
  const playStartMsRef = useRef(0);
  const hasStartedRef = useRef(!!autoPlay);
  const onEndCalledRef = useRef(false);
  const lastProcessedTickRef = useRef<number>(-1);
  const playingRef = useRef(playing);

  useEffect(() => {
    tickIndexRef.current = tickIndex;
  }, [tickIndex]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const dispatchAudioRange = useCallback(
    (fromExclusive: number, toInclusive: number) => {
      for (let t = fromExclusive + 1; t <= toInclusive; t++) {
        const events = timeline.audioByTick?.[t] ?? timeline.audio.filter((e) => e.tick === t);
        for (const ev of events) onAudioEvent?.(ev);
      }
      lastProcessedTickRef.current = toInclusive;
    },
    [timeline, onAudioEvent]
  );

  // Tick Clock: 오차 없이 500ms 간격. 목표 시각 = playStartMs + next * 500
  const scheduleNextTick = useCallback(() => {
    if (timeoutRef.current) return;
    const cur = tickIndexRef.current;
    const next = Math.min(cur + 1, maxTick);
    const now = performance.now();
    const targetMs = playStartMsRef.current + next * TICK_MS_STRICT;
    const delayMs = Math.max(0, targetMs - now);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const now2 = performance.now();
      const delta = lastTickTimeRef.current ? now2 - lastTickTimeRef.current : 0;
      lastTickTimeRef.current = now2;

      setLastDeltaMs(delta);

      dispatchAudioRange(cur, next);
      tickIndexRef.current = next;
      setTickIndex(next);

      if (next >= maxTick) {
        setPlaying(false);
        if (!onEndCalledRef.current) {
          onEndCalledRef.current = true;
          onEnd?.();
        }
        return;
      }
      scheduleNextTick();
    }, delayMs);
  }, [maxTick, dispatchAudioRange, onEnd]);

  useEffect(() => {
    if (!snapToTick || !playing) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    // 현재 tick 오디오 1회 디스패치 + 재생 시작 시각 고정 (이후 모든 tick은 이 시각 기준)
    if (hasStartedRef.current) {
      lastProcessedTickRef.current = tickIndexRef.current - 1;
      dispatchAudioRange(tickIndexRef.current - 1, tickIndexRef.current);
    }
    playStartMsRef.current = performance.now();
    lastTickTimeRef.current = playStartMsRef.current;
    scheduleNextTick();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [playing, snapToTick, dispatchAudioRange, scheduleNextTick]);

  // rAF 경로: snapToTick=false 일 때만
  useEffect(() => {
    if (snapToTick || !playing) return;
    onEndCalledRef.current = false;
    startMsRef.current = performance.now();
    startTMsRef.current = tMsRaf;

    const tick = () => {
      const elapsed = (performance.now() - startMsRef.current) * speed;
      const rawTMs = startTMsRef.current + elapsed;
      const maxTMs = maxTick * TICK_MS;
      const displayTMs = Math.min(rawTMs, maxTMs);
      setTMsRaf(displayTMs);

      if (displayTMs >= maxTMs) {
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
  }, [playing, speed, maxTick, onEnd, snapToTick]);

  // rAF 경로 오디오 디스패치
  useEffect(() => {
    if (snapToTick) return;
    if (!hasStartedRef.current) return;
    const currentTick = Math.floor(tMsRaf / TICK_MS);
    const prev = lastProcessedTickRef.current;
    if (currentTick <= prev) {
      if (currentTick < prev) lastProcessedTickRef.current = currentTick;
      return;
    }
    for (let t = prev + 1; t <= currentTick; t++) {
      const events = timeline.audioByTick?.[t] ?? timeline.audio.filter((e) => e.tick === t);
      for (const ev of events) onAudioEvent?.(ev);
    }
    lastProcessedTickRef.current = currentTick;
  }, [snapToTick, tMsRaf, timeline, onAudioEvent]);

  const seek = useCallback(
    (ms?: number) => {
      if (ms === undefined) return;
      const msPerTick = snapToTick ? TICK_MS_STRICT : TICK_MS;
      const tick = Math.max(0, Math.min(Math.floor(ms / msPerTick), maxTick));
      if (snapToTick) {
        setTickIndex(tick);
        tickIndexRef.current = tick;
      } else {
        setTMsRaf(tick * TICK_MS);
      }
    },
    [maxTick, snapToTick]
  );

  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        hasStartedRef.current = true;
        if (snapToTick) {
          lastTickTimeRef.current = performance.now();
          setPlaying(true);
          // Tick Clock effect에서 현재 tick 오디오 디스패치
        } else {
          lastProcessedTickRef.current = Math.floor(tMsRaf / TICK_MS) - 1;
          dispatchAudioRange(lastProcessedTickRef.current, Math.floor(tMsRaf / TICK_MS));
          setPlaying(true);
        }
      },
      pause: () => setPlaying(false),
      reset: () => {
        setPlaying(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (snapToTick) {
          setTickIndex(0);
          tickIndexRef.current = 0;
        } else {
          setTMsRaf(0);
        }
        lastProcessedTickRef.current = -1;
        hasStartedRef.current = !!autoPlay;
      },
      isPlaying: () => playingRef.current,
    }),
    [dispatchAudioRange, autoPlay, snapToTick, tMsRaf]
  );

  const tMs = snapToTick ? tickIndex * TICK_MS_STRICT : tMsRaf;

  return (
    <div data-runtime-player className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <PlayRenderer tMs={tMs} visuals={timeline.visuals} totalTicks={timeline.totalTicks} />
      </div>
      {debug && (
        <PlayTestDebugOverlay
          tMs={tMs}
          timeline={timeline}
          tickIndex={snapToTick ? tickIndex : undefined}
          lastDeltaMs={snapToTick ? lastDeltaMs : undefined}
        />
      )}
      {!autoPlay && !hideControls && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
            onClick={() => seek(0)}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
});
