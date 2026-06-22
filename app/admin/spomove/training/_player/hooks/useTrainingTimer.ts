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
import { resolveTrainingEngine } from '../constants';
import { registerPresentedSignal, type RepsState } from '../lib/repsLogic';

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
  basicNumberOverlay,
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
  basicNumberOverlay?: 'none' | '2' | '3';
  onSignal: (sig: Record<string, unknown>) => void;
  onFinish: (dupStats?: DupStats | null) => void;
}) {
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const idxRef = useRef(-1);
  /** reps 모드: registerPresentedSignal 상태 (count-based 종료 판단에 사용) */
  const repsStateRef = useRef<RepsState>({ presented: 0 });
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
    const { engineMode, engineLevel } = resolveTrainingEngine(mode, level);
    if (engineMode === 'basic') {
      genRef.current = createBasicSignalGenerator(level, colors, fruitSlides, basicNumberOverlay);
    } else if (engineMode === 'simon') {
      genRef.current = createSimonSignalGenerator(engineLevel, colors);
    } else if (engineMode === 'taskswitch') {
      genRef.current = createTaskSwitchSignalGenerator(engineLevel, colors, fruitOpts);
    } else if (engineMode === 'stroop' || engineMode === 'flanker' || engineMode === 'gonogo') {
      genRef.current = createModeColorDupGenerator(engineMode, engineLevel, colors, fruitOpts);
    } else {
      genRef.current = null;
    }
    startRef.current = performance.now();
    idxRef.current = -1;
    repsStateRef.current = { presented: 0 };

    // time 모드: elapsed 기준 종료. reps 모드: presentedCount 기준 종료.
    // accel 가속 곡선의 레퍼런스 totalMs는 reps 모드에서도 추정값으로 유지.
    const totalMs = timeMode === 'time' ? duration * 1000 : targetReps * speed * 1000;

    const getSpeedMs = (elapsed: number) => {
      if (!accel || totalMs === 0) return speed * 1000;
      const ratio = Math.min(elapsed / totalMs, 1);
      return speed * 1000 * (1 - 0.4 * ratio);
    };

    const nextSignalTimeRef = { t: 0 };

    const finish = () => {
      ttsClear();
      const dup = engineMode === 'basic' ? genRef.current?.getStats() ?? null : null;
      onFinish(dup);
    };

    const emitSignal = (elapsed: number) => {
      const sig =
        engineMode === 'basic' || engineMode === 'simon' || engineMode === 'stroop' || engineMode === 'flanker' || engineMode === 'gonogo' || engineMode === 'taskswitch'
          ? genRef.current?.next() ?? null
          : generateSignal(engineMode, engineLevel, colors, fruitSlides ? { fruitSlides } : undefined);
      if (sig) {
        onSignal(sig);
        if (audioMode === 'beep') playBeep(getBeepForSignal(sig) ?? 'mid');
        else {
          const v = getSignalVoice();
          if (v) tts(v, true);
        }
      }
      const { next: nextReps } = registerPresentedSignal({
        state: repsStateRef.current,
        hasValidSignal: sig !== null,
        targetReps,
      });
      repsStateRef.current = nextReps;
      nextSignalTimeRef.t = elapsed + getSpeedMs(elapsed);
    };

    if (!accel) {
      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        // time 모드: 경과시간 기준 종료
        if (timeMode === 'time' && elapsed >= totalMs) {
          finish();
          return;
        }
        const i = Math.floor(elapsed / (speed * 1000));
        if (i > idxRef.current) {
          idxRef.current = i;
          emitSignal(elapsed);
          // reps 모드: registerPresentedSignal이 카운팅한 횟수로 종료 판정
          if (timeMode === 'reps' && repsStateRef.current.presented >= targetReps) {
            finish();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      nextSignalTimeRef.t = 0;
      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        if (timeMode === 'time' && elapsed >= totalMs) {
          finish();
          return;
        }
        if (elapsed >= nextSignalTimeRef.t) {
          emitSignal(elapsed);
          if (timeMode === 'reps' && repsStateRef.current.presented >= targetReps) {
            finish();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ttsClear();
    };
  }, [active, speed, accel, timeMode, duration, targetReps, mode, level, audioMode, colors, fruitSlides, basicNumberOverlay, onSignal, onFinish]);

  const getProgress = useCallback(() => {
    if (!startRef.current) return { timeLeft: duration, repsLeft: targetReps, progress: 0 };
    const e = performance.now() - startRef.current;
    const speedMs = speed * 1000;
    const totalMs = timeMode === 'time' ? duration * 1000 : targetReps * speedMs;
    if (timeMode === 'reps') {
      const presented = repsStateRef.current.presented;
      const remaining = Math.max(0, targetReps - presented);
      return {
        timeLeft: Math.max(0, Math.ceil(remaining * speed)),
        repsLeft: remaining,
        progress: Math.min(presented / Math.max(1, targetReps), 1),
      };
    }
    return {
      timeLeft: Math.max(0, Math.ceil((totalMs - e) / 1000)),
      repsLeft: Math.max(0, targetReps - Math.floor(e / speedMs)),
      progress: Math.min(e / totalMs, 1),
    };
  }, [speed, timeMode, duration, targetReps]);

  return { getProgress };
}
