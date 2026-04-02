'use client';

import { useEffect, useRef, useCallback } from 'react';
import { generateSignal } from '../lib/signals';
import { playBeep, getBeepForSignal } from '../lib/audio';
import { ttsClear } from '../lib/tts';

type ColorItem = { id: string; name: string; bg: string; text: string; symbol: string };

/**
 * 이중과제 2-1번(색깔·화살표) 터치형: 첫 신호 자동, 이후 화면 터치마다 다음 신호.
 * 분량(targetReps) = 총 제시할 신호 개수.
 */
export function useDual21TouchTraining({
  active,
  trainingKey,
  targetReps,
  colors,
  audioMode,
  onSignal,
  onFinish,
}: {
  active: boolean;
  trainingKey: number;
  targetReps: number;
  colors: ColorItem[];
  audioMode: string;
  onSignal: (sig: Record<string, unknown>) => void;
  onFinish: () => void;
}) {
  const shownRef = useRef(0);
  const startRef = useRef(0);
  /** 세션당 첫 신호 1회만 (Strict Mode 이중 실행 방지) */
  const bootKeyRef = useRef<number | null>(null);

  const emitOne = useCallback(() => {
    const sig = generateSignal('dual', 2, colors);
    if (!sig) return;
    onSignal(sig);
    if (audioMode === 'beep') playBeep(getBeepForSignal(sig) ?? 'mid');
  }, [colors, onSignal, audioMode]);

  useEffect(() => {
    if (!active) {
      shownRef.current = 0;
      return;
    }
    /** trainingKey당 1회만 부트(React Strict Mode 재마운트 시 bootKeyRef 유지로 이중 신호 방지) */
    if (bootKeyRef.current === trainingKey) return;
    bootKeyRef.current = trainingKey;

    shownRef.current = 0;
    startRef.current = performance.now();
    ttsClear();
    const n = Math.max(1, targetReps);
    shownRef.current = 1;
    emitOne();
    if (n <= 1) onFinish();
  }, [active, trainingKey, targetReps, emitOne, onFinish]);

  const advance = useCallback(() => {
    if (!active) return;
    const n = Math.max(1, targetReps);
    if (shownRef.current >= n) return;
    shownRef.current += 1;
    emitOne();
    if (shownRef.current >= n) onFinish();
  }, [active, targetReps, emitOne, onFinish]);

  const getProgress = useCallback(() => {
    const n = Math.max(1, targetReps);
    const done = shownRef.current;
    return {
      timeLeft: Math.max(0, n - done),
      repsLeft: Math.max(0, n - done),
      progress: Math.min(done / n, 1),
    };
  }, [targetReps]);

  return { advance, getProgress };
}
