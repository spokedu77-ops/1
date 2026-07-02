'use client';

import { useEffect, useRef, useState } from 'react';
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
import { getNextIntervalState } from '../lib/intervalTimer';

type ColorItem = { id: string; name: string; bg: string; text: string; symbol: string };

export function useIntervalTimer({
  active,
  workSec,
  restSec,
  sets,
  speed,
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
  workSec: number;
  restSec: number;
  sets: number;
  speed: number;
  mode: string;
  level: number;
  audioMode: string;
  colors: ColorItem[];
  fruitSlides?: FruitSlide[];
  basicNumberOverlay?: 'none' | '2' | '3';
  onSignal: (sig: Record<string, unknown>) => void;
  onFinish: (dupStats?: DupStats | null) => void;
}) {
  const rafRef = useRef<number | null>(null);
  const genRef = useRef<
    | ReturnType<typeof createBasicSignalGenerator>
    | ReturnType<typeof createModeColorDupGenerator>
    | ReturnType<typeof createTaskSwitchSignalGenerator>
    | ReturnType<typeof createSimonSignalGenerator>
    | null
  >(null);
  const startRef = useRef<number>(0);
  const phaseRef = useRef<'work' | 'rest'>('work');
  const setRef = useRef(0);
  const lastSignalRef = useRef(-1);
  /** setIntervalLeft를 초 단위로만 갱신 (매 프레임 React 재렌더 방지) */
  const lastLeftRef = useRef(-1);
  const [intervalPhase, setIntervalPhase] = useState<'work' | 'rest'>('work');
  const [intervalSet, setIntervalSet] = useState(1);
  const [intervalLeft, setIntervalLeft] = useState(workSec);

  useEffect(() => {
    if (!active) {
      setIntervalPhase('work');
      setIntervalSet(1);
      setIntervalLeft(workSec);
      return;
    }
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
    phaseRef.current = 'work';
    setRef.current = 0;
    lastSignalRef.current = -1;
    lastLeftRef.current = workSec;
    setIntervalPhase('work');
    setIntervalSet(1);
    setIntervalLeft(workSec);
    if (audioMode !== 'off') tts('시작!', true);

    const tick = (now: number) => {
      const cycleLen = workSec + restSec;
      const totalElapsed = (now - startRef.current) / 1000;
      const cycleIdx = Math.floor(totalElapsed / cycleLen);
      const withinCycle = totalElapsed - cycleIdx * cycleLen;
      const currentPhase = withinCycle < workSec ? 'work' : 'rest';
      const currentSet = cycleIdx + 1;
      const timeInPhase = currentPhase === 'work' ? withinCycle : withinCycle - workSec;
      const phaseDur = currentPhase === 'work' ? workSec : restSec;
      const left = Math.max(0, Math.ceil(phaseDur - timeInPhase));

      // 마지막 세트 work 완료 직후 rest 진입 없이 종료
      // getNextIntervalState: work 완료 + 마지막 세트 → completed=true
      const isLastRestPhase =
        currentPhase === 'rest' &&
        getNextIntervalState({ currentSet, totalSets: sets, phase: 'work' }).completed;
      if (currentSet > sets || isLastRestPhase) {
        ttsClear();
        const dup = engineMode === 'basic' ? genRef.current?.getStats() ?? null : null;
        onFinish(dup);
        return;
      }

      if (currentPhase !== phaseRef.current) {
        phaseRef.current = currentPhase;
        setIntervalPhase(currentPhase);
        lastSignalRef.current = -1;
        if (audioMode !== 'off') tts(currentPhase === 'work' ? `${currentSet}세트 시작!` : '휴식', true);
      }
      if (currentSet !== setRef.current) {
        setRef.current = currentSet;
        setIntervalSet(currentSet);
      }
      // 초 단위가 바뀔 때만 React 상태 갱신
      if (left !== lastLeftRef.current) {
        lastLeftRef.current = left;
        setIntervalLeft(left);
      }

      if (currentPhase === 'work') {
        const sigIdx = Math.floor(timeInPhase / speed);
        if (sigIdx > lastSignalRef.current) {
          lastSignalRef.current = sigIdx;
          const sig =
            engineMode === 'basic' || engineMode === 'simon' || engineMode === 'stroop' || engineMode === 'flanker' || engineMode === 'gonogo' || engineMode === 'taskswitch'
              ? genRef.current?.next() ?? null
              : generateSignal(engineMode, engineLevel, colors, fruitSlides ? { fruitSlides } : undefined);
          if (sig) {
            onSignal(sig);
            if (audioMode === 'beep') {
              playBeep(getBeepForSignal(sig) ?? 'mid');
            } else {
              const voice = getSignalVoice();
              if (voice) tts(voice, true);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ttsClear();
    };
  }, [active, workSec, restSec, sets, speed, mode, level, audioMode, colors, fruitSlides, basicNumberOverlay, onSignal, onFinish]);

  return { intervalPhase, intervalSet, intervalLeft };
}
