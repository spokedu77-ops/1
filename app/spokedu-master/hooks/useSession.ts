'use client';

import { useCallback, useRef } from 'react';
import { useMasterStore } from '../store';

export function useReactionTimer() {
  const cueStartRef = useRef<number>(0);
  const recordTime = useMasterStore((state) => state.recordTime);

  const markCue = useCallback(() => {
    cueStartRef.current = performance.now();
  }, []);

  const markResponse = useCallback((): number | null => {
    if (!cueStartRef.current) return null;

    const reactionTime = Math.round(performance.now() - cueStartRef.current);
    cueStartRef.current = 0;

    if (reactionTime < 50 || reactionTime > 3000) return null;
    recordTime(reactionTime);
    return reactionTime;
  }, [recordTime]);

  return { markCue, markResponse };
}

export function useSession() {
  const store = useMasterStore();
  const { markCue, markResponse } = useReactionTimer();
  const stats = useMasterStore((state) => {
    const times = state.activeSession?.times ?? [];
    if (!times.length) return null;

    const avg = Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
    const best = Math.min(...times);
    const variance = times.reduce((value, time) => value + Math.pow(time - avg, 2), 0) / times.length;

    return { avg, best, stdDev: Math.round(Math.sqrt(variance)) };
  });

  return {
    activeSession: store.activeSession,
    isRunning: store.activeSession?.running ?? false,
    isPaused: store.activeSession?.paused ?? false,
    stats,
    start: store.startSession,
    end: store.endActiveSession,
    pause: store.pauseSession,
    resume: store.resumeSession,
    markCue,
    markResponse,
  };
}
