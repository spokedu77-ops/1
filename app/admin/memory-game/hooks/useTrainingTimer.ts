'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  generateSignal,
  createBasicSignalGenerator,
  createModeColorDupGenerator,
  createTaskSwitchSignalGenerator,
  createSimonSignalGenerator,
  type DupStats,
  type FruitSlide,
} from '../lib/signals';
import { playBeep, getBeepForSignal, getSignalVoice } from '../lib/audio';
import { tts, ttsClear } from '../lib/tts';

type ColorItem = { id: string; name: string; bg: string; text: string; symbol: string };

export function useTrainingTimer({
  active,
  speed,
  accel = false,
  timeMode,
  duration,
  targetReps,
  mode,
  level,
  audioMode,
  colors,
  fruitSlides,
  onSignal,
  onFinish,
}: {
  active: boolean;
  speed: number;
  accel?: boolean;
  timeMode: string;
  duration: number;
  targetReps: number;
  mode: string;
  level: number;
  audioMode: string;
  colors: ColorItem[];
  /** basic 변형 색지각(3~5번) 슬롯; 미전달 시 signals 기본값 */
  fruitSlides?: FruitSlide[];
  onSignal: (sig: Record<string, unknown>) => void;
  onFinish: (dupStats?: DupStats | null) => void;
}) {
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const idxRef = useRef(-1);
  const genRef = useRef<
    | ReturnType<typeof createBasicSignalGenerator>
    | ReturnType<typeof createModeColorDupGenerator>
    | ReturnType<typeof createTaskSwitchSignalGenerator>
    | ReturnType<typeof createSimonSignalGenerator>
    | null
  >(null);

  useEffect(() => {
    if (!active) return;
    const fruitOpts = fruitSlides ? { fruitSlides } : undefined;
    if (mode === 'basic') {
      genRef.current = createBasicSignalGenerator(level, colors, fruitSlides);
    } else if (mode === 'simon') {
      genRef.current = createSimonSignalGenerator(level, colors);
    } else if (mode === 'taskswitch') {
      genRef.current = createTaskSwitchSignalGenerator(level, colors, fruitOpts);
    } else if (mode === 'dual' || mode === 'stroop' || mode === 'flanker' || mode === 'gonogo') {
      genRef.current = createModeColorDupGenerator(mode, level, colors, fruitOpts);
    } else {
      genRef.current = null;
    }
    startRef.current = performance.now();
    idxRef.current = -1;
    const totalMs = timeMode === 'time' ? duration * 1000 : targetReps * speed * 1000;

    const getSpeedMs = (elapsed: number) => {
      if (!accel || totalMs === 0) return speed * 1000;
      const ratio = Math.min(elapsed / totalMs, 1);
      return speed * 1000 * (1 - 0.4 * ratio);
    };

    const nextSignalTimeRef = { t: 0 };

    const finish = () => {
      ttsClear();
      const dup = mode === 'basic' ? genRef.current?.getStats() ?? null : null;
      onFinish(dup);
    };

    const emitSignal = (elapsed: number) => {
      const sig =
        mode === 'basic' || mode === 'simon' || mode === 'dual' || mode === 'stroop' || mode === 'flanker' || mode === 'gonogo' || mode === 'taskswitch'
          ? genRef.current?.next() ?? null
          : generateSignal(mode, level, colors, fruitSlides ? { fruitSlides } : undefined);
      if (sig) {
        onSignal(sig);
        if (audioMode === 'beep') playBeep(getBeepForSignal(sig) ?? 'mid');
        else {
          const v = getSignalVoice(sig, mode, level, audioMode);
          if (v) tts(v, true);
        }
      }
      nextSignalTimeRef.t = elapsed + getSpeedMs(elapsed);
    };

    if (!accel) {
      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        if (elapsed >= totalMs) {
          finish();
          return;
        }
        const i = Math.floor(elapsed / (speed * 1000));
        if (i > idxRef.current) {
          idxRef.current = i;
          emitSignal(elapsed);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      nextSignalTimeRef.t = 0;
      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        if (elapsed >= totalMs) {
          finish();
          return;
        }
        if (elapsed >= nextSignalTimeRef.t) emitSignal(elapsed);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ttsClear();
    };
  }, [active, speed, accel, timeMode, duration, targetReps, mode, level, audioMode, colors, fruitSlides, onSignal, onFinish]);

  const getProgress = useCallback(() => {
    if (!startRef.current) return { timeLeft: duration, repsLeft: targetReps, progress: 0 };
    const e = performance.now() - startRef.current;
    const speedMs = speed * 1000;
    const totalMs = timeMode === 'time' ? duration * 1000 : targetReps * speedMs;
    return {
      timeLeft: Math.max(0, Math.ceil((totalMs - e) / 1000)),
      repsLeft: Math.max(0, targetReps - Math.floor(e / speedMs)),
      progress: Math.min(e / totalMs, 1),
    };
  }, [speed, timeMode, duration, targetReps]);

  return { getProgress };
}
