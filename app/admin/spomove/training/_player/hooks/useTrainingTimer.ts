'use client';

import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
import { resolveTrainingEngine, type SpatialArrowColorMapping } from '../constants';
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
  spatialArrowColorMode = 'basic',
  spatialArrowColorMapping = 'random',
  flankerStimulusType,
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
  spatialArrowColorMode?: 'basic' | 'color';
  spatialArrowColorMapping?: SpatialArrowColorMapping;
  flankerStimulusType?: 'color' | 'number';
  onSignal: (sig: Record<string, unknown>) => void;
  onFinish: (dupStats?: DupStats | null) => void;
}) {
  // fruitSlides를 ref로 관리 — effect 재실행 없이 항상 최신 슬라이드를 읽음
  // useLayoutEffect: RAF 전에 동기적으로 실행되므로 다음 프레임부터 최신 슬라이드 반영
  const fruitSlidesRef = useRef(fruitSlides);
  useLayoutEffect(() => {
    fruitSlidesRef.current = fruitSlides;
  });

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
    const { engineMode, engineLevel } = resolveTrainingEngine(mode, level);
    const effectiveArrowColorMode: 'basic' | 'color' =
      mode === 'stroop' && level === 1 ? 'color' : spatialArrowColorMode;
    if (engineMode === 'basic') {
      // fruitSlides가 undefined이면 color 모드(이미지 없음) — getter를 undefined로 전달
      // defined이면 항상 최신 슬라이드를 읽는 getter 전달 → 타이머 재시작 없이 이미지 반영
      const getSlidesRef = () => fruitSlidesRef.current;
      genRef.current = createBasicSignalGenerator(engineLevel, colors, getSlidesRef, basicNumberOverlay, effectiveArrowColorMode, spatialArrowColorMapping);
    } else if (engineMode === 'simon') {
      const getSlidesRef = () => fruitSlidesRef.current;
      genRef.current = createSimonSignalGenerator(engineLevel, colors, getSlidesRef);
    } else if (engineMode === 'taskswitch') {
      const fruitOpts = fruitSlidesRef.current ? { fruitSlides: fruitSlidesRef.current } : undefined;
      genRef.current = createTaskSwitchSignalGenerator(engineLevel, colors, fruitOpts);
    } else if (engineMode === 'stroop' || engineMode === 'flanker' || engineMode === 'gonogo') {
      const fruitOpts = {
        ...(fruitSlidesRef.current ? { fruitSlides: fruitSlidesRef.current } : {}),
        ...(engineMode === 'flanker' ? { flankerStimulusType } : {}),
      };
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
          : generateSignal(engineMode, engineLevel, colors, fruitSlidesRef.current ? { fruitSlides: fruitSlidesRef.current } : undefined);
      if (sig) {
        onSignal(sig);
        if (audioMode === 'beep') playBeep(getBeepForSignal(sig) ?? 'mid');
        else {
          const v = getSignalVoice();
          if (v) tts(v, true);
        }
      }
      const hasValidSignal = sig !== null;
      const { next: nextReps } = registerPresentedSignal({
        state: repsStateRef.current,
        hasValidSignal,
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
  // fruitSlides는 의존성 제외 — ref로 추적하므로 슬라이드 변경 시 타이머 재시작 없음
  }, [active, speed, accel, timeMode, duration, targetReps, mode, level, audioMode, colors, basicNumberOverlay, spatialArrowColorMode, spatialArrowColorMapping, flankerStimulusType, onSignal, onFinish]);

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
