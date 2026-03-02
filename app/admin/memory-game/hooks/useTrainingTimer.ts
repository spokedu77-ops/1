'use client';

import { useEffect, useRef, useCallback } from 'react';
import { generateSignal } from '../lib/signals';
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
  onSignal: (sig: Record<string, unknown>) => void;
  onFinish: () => void;
}) {
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const idxRef = useRef(-1);

  useEffect(() => {
    if (!active) return;
    startRef.current = performance.now();
    idxRef.current = -1;
    const totalMs = timeMode === 'time' ? duration * 1000 : targetReps * speed * 1000;

    const getSpeedMs = (elapsed: number) => {
      if (!accel || totalMs === 0) return speed * 1000;
      const ratio = Math.min(elapsed / totalMs, 1);
      return speed * 1000 * (1 - 0.4 * ratio);
    };

    const nextSignalTimeRef = { t: 0 };
    const dupWindow: string[] = [];
    const MAX_DUP_RATIO = 0.25;

    const emitSignal = (elapsed: number) => {
      let sig: Record<string, unknown> | null = null;
      let tries = 0;
      while (tries < 20) {
        sig = generateSignal(mode, level, colors);
        if (!sig) break;
        const key = (sig.bg as string) + ((sig.content as Record<string, unknown>)?.label ?? (sig.content as Record<string, unknown>)?.word ?? '');
        const recentDups = dupWindow.filter((k) => k === key).length;
        if (dupWindow.length < 4 || recentDups / dupWindow.length < MAX_DUP_RATIO) break;
        tries++;
      }
      if (sig) {
        const key = (sig.bg as string) + ((sig.content as Record<string, unknown>)?.label ?? (sig.content as Record<string, unknown>)?.word ?? '');
        dupWindow.push(key);
        if (dupWindow.length > 8) dupWindow.shift();
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
          ttsClear();
          onFinish();
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
          ttsClear();
          onFinish();
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
  }, [active, speed, accel, timeMode, duration, targetReps, mode, level, audioMode, colors, onSignal, onFinish]);

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
