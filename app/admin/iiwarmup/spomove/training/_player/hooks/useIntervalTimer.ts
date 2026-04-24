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
    phaseRef.current = 'work';
    setRef.current = 0;
    lastSignalRef.current = -1;
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

      if (currentSet > sets) {
        ttsClear();
        const dup = mode === 'basic' ? genRef.current?.getStats() ?? null : null;
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
      setIntervalLeft(left);

      if (currentPhase === 'work') {
        const sigIdx = Math.floor(timeInPhase / speed);
        if (sigIdx > lastSignalRef.current) {
          lastSignalRef.current = sigIdx;
          const sig =
            mode === 'basic' || mode === 'simon' || mode === 'dual' || mode === 'stroop' || mode === 'flanker' || mode === 'gonogo' || mode === 'taskswitch'
              ? genRef.current?.next() ?? null
              : generateSignal(mode, level, colors, fruitSlides ? { fruitSlides } : undefined);
          if (sig) {
            onSignal(sig);
            if (audioMode === 'beep') {
              playBeep(getBeepForSignal(sig) ?? 'mid');
            } else {
              const voice = getSignalVoice(sig, mode, level, audioMode);
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
  }, [active, workSec, restSec, sets, speed, mode, level, audioMode, colors, fruitSlides, onSignal, onFinish]);

  return { intervalPhase, intervalSet, intervalLeft };
}
