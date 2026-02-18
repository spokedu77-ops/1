'use client';

/**
 * Think 150s 재생 로직 공통 훅
 * Admin(Think150Player) / 구독자(ThinkPhaseWrapper)에서 동일 재생 시맨틱 공유
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Think150Config } from '@/app/lib/admin/engines/think150';
import type { ThinkTimelineEvent } from '@/app/lib/admin/engines/think150/types';
import { findCurrentEventO1, THINK150_TOTAL_MS } from '@/app/lib/admin/engines/think150/think150Playback';
import {
  initThink150Audio,
  scheduleThink150Sounds,
  startBGM,
  resumeAudioContext,
  suspendAudioContext,
} from '@/app/lib/admin/engines/think150/think150Audio';

export type UseThink150PlaybackOptions = {
  /** 재생 완료 시 호출 (구독자용) */
  onEnd?: () => void;
  /** 초기 재생 여부 (Admin: false, 구독자: true) */
  initialPlaying?: boolean;
};

export function useThink150Playback(
  timeline: ThinkTimelineEvent[],
  config: Think150Config,
  options: UseThink150PlaybackOptions = {}
) {
  const { onEnd, initialPlaying = false } = options;
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(initialPlaying);
  const rafRef = useRef<number>(0);
  const startMsRef = useRef(0);
  const startTMsRef = useRef(0);
  const eventIndexRef = useRef(0);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    eventIndexRef.current = 0;
  }, [timeline]);

  const event = findCurrentEventO1(timeline, currentMs, eventIndexRef);

  useEffect(() => {
    if (!playing) return;
    const startAtMs = currentMs;
    startMsRef.current = performance.now();
    startTMsRef.current = startAtMs;

    resumeAudioContext();
    initThink150Audio().then(() => {
      scheduleThink150Sounds(timeline, startAtMs, startAtMs);
      if (config.bgmPath) {
        startBGM(config.bgmPath, startAtMs, THINK150_TOTAL_MS - startAtMs).catch(() => {});
      }
    });

    const tick = () => {
      const elapsed = performance.now() - startMsRef.current;
      const newMs = startTMsRef.current + elapsed;
      const clamped = Math.min(newMs, THINK150_TOTAL_MS);
      setCurrentMs(clamped);
      if (clamped >= THINK150_TOTAL_MS) {
        setPlaying(false);
        onEndRef.current?.();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      suspendAudioContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentMs is set inside tick; adding it would cause loop
  }, [playing, timeline, config.bgmPath]);

  const reset = useCallback(() => {
    setPlaying(false);
    setCurrentMs(0);
  }, []);

  return {
    currentMs,
    event,
    playing,
    setPlaying,
    reset,
    totalMs: THINK150_TOTAL_MS,
  };
}
