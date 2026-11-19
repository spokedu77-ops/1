'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { emptyColorStimulusCounts, type ColorStimulusCounts } from '../lib/trainingResultSummary';
import { createNumberReaderTrial, normalizeNumberReaderReps, normalizeNumberReaderSeconds, NUMBER_READER_ZONES,
  numberReaderFlightSeconds, numberReaderPhaseSeconds, type NumberReaderPhase } from '../lib/movingNumberReader';
import { useEngineStopRequest } from '../lib/engineStopRequest';
import { drawNumberReaderFrame } from '../lib/movingNumberReaderCanvas';
import { ReactTrainStartCountdownOverlay, REACT_TRAIN_START_COUNTDOWN_SEC, runReactTrainStartCountdown } from '../lib/reactTrainStartCountdown';
import { spomovePerformance as performance, spomoveRequestAnimationFrame as requestAnimationFrame,
  spomoveCancelAnimationFrame as cancelAnimationFrame } from '../lib/runtimeClock';

type Props = {
  targetReps: number;
  flightSeconds: number;
  difficulty?: 'easy' | 'hard';
  onProgress: (presented: number, counts: ColorStimulusCounts) => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

export function MovingNumberReaderTraining({ targetReps, flightSeconds, difficulty = 'easy', onProgress, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onProgress, onComplete });
  useEffect(() => { callbacks.current = { onProgress, onComplete }; }, [onProgress, onComplete]);
  const [countdown, setCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const total = normalizeNumberReaderReps(targetReps);
  const fixedSeconds = normalizeNumberReaderSeconds(flightSeconds);
  const progressive = difficulty === 'hard';
  useEngineStopRequest(() => stopRef.current?.());

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('숫자 캡슐 Canvas를 시작할 수 없습니다.');
    const style = getComputedStyle(canvas);
    const bodyFont = style.fontFamily || 'sans-serif';
    const numberFont = style.getPropertyValue('--spm-font-display').trim() || bodyFont;
    let done = false; let started = false; let frame = 0; let round = 1; let presented = 0;
    let phase: NumberReaderPhase = 'READY'; let phaseStart = performance.now();
    let trial = createNumberReaderTrial(); let shown = false; let flightStarted = false;
    let counts = emptyColorStimulusCounts(); let width = 1; let height = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const finish = (reason: ReactTrainCompleteStats['completionReason']) => {
      if (done) return;
      done = true; cancelAnimationFrame(frame); observer.disconnect();
      callbacks.current.onComplete({ stims: presented, maxCombo: 0,
        laneCount: [counts.red, counts.blue, counts.green, counts.yellow], completionReason: reason });
    };
    stopRef.current = () => finish(flightStarted ? 'stopped_early' : 'cancelled');
    const tick = () => {
      if (done) return;
      if (!started) { frame = requestAnimationFrame(safeTick); return; }
      const now = performance.now();
      if (now - phaseStart >= numberReaderPhaseSeconds(phase, fixedSeconds, round, progressive) * 1000) {
        if (phase === 'READY') { phase = 'FLY'; flightStarted = true; }
        else if (phase === 'FLY') {
          // A suspended renderer must never count a flight nobody could see.
          if (!shown) { finish('failed'); return; }
          phase = 'ACTION';
        } else if (phase === 'ACTION') phase = 'REVEAL';
        else {
          if (round >= total) { finish('natural_complete'); return; }
          round += 1; trial = createNumberReaderTrial(); shown = false; phase = 'READY';
        }
        phaseStart = now;
      }
      const elapsed = (now - phaseStart) / 1000;
      const duration = numberReaderPhaseSeconds(phase, fixedSeconds, round, progressive);
      const seconds = progressive ? numberReaderFlightSeconds(round) : fixedSeconds;
      const visible = drawNumberReaderFrame(ctx, width, height, trial, round, phase, elapsed / duration, now, seconds, bodyFont, numberFont, progressive);
      if (visible && !shown) {
        shown = true; presented += 1;
        const id = NUMBER_READER_ZONES[trial.number - 1]!.id;
        counts = { ...counts, [id]: counts[id] + 1 };
        callbacks.current.onProgress(presented, counts);
      }
      canvas.dataset.phase = phase; canvas.dataset.round = String(round);
      canvas.dataset.flightSeconds = seconds.toFixed(2);
      canvas.dataset.progress = String(Math.min(1, elapsed / duration));
      canvas.dataset.presented = String(presented);
      canvas.dataset.pillars = phase === 'FLY' ? String(round < 3 ? 0 : round < 5 ? 1 : 3) : '0';
      canvas.dataset.phaseSeconds = String(duration);
      canvas.dataset.difficulty = difficulty;
      canvas.setAttribute('aria-label', phase === 'READY' ? `소닉 리더 ${round} / ${total}회 · 물체 추적 준비`
        : phase === 'FLY' ? `소닉 리더 ${round} / ${total}회 · 숫자 캡슐 추적`
          : phase === 'ACTION' ? `소닉 리더 ${round} / ${total}회 · 방금 본 숫자의 구역으로 이동`
            : `소닉 리더 ${round} / ${total}회 · 정답 ${trial.number}구역`);
      if (phase === 'REVEAL') canvas.dataset.answer = String(trial.number);
      else delete canvas.dataset.answer;
      frame = requestAnimationFrame(safeTick);
    };
    const safeTick = () => { try { tick(); } catch { finish('failed'); } };
    const stopCountdown = runReactTrainStartCountdown({ onTick:setCountdown, onDone:() => { started = true; phaseStart = performance.now(); } });
    frame = requestAnimationFrame(safeTick);
    return () => { done = true; stopCountdown(); cancelAnimationFrame(frame); observer.disconnect(); stopRef.current = null; };
  }, [total, fixedSeconds, progressive, difficulty]);

  return <section aria-label="움직이는 숫자 판별 실행" className="sonic-reader" style={{ position:'relative', height: '100%', overflow: 'hidden', background: '#020617', color: '#fff', fontFamily: 'var(--spm-font-body)' }}>
    <style>{`.sonic-reader-stop{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:90;min-height:44px;padding:8px 16px;border:1px solid #64748b80;border-radius:12px;background:#0f172ad9;color:#fff;font:600 13px var(--spm-font-body);backdrop-filter:blur(10px)}.sonic-reader-stop:focus-visible{outline:3px solid #38bdf8;outline-offset:3px}`}</style>
    <ReactTrainStartCountdownOverlay countdown={countdown} />
    <button type="button" className="sonic-reader-stop" onClick={() => stopRef.current?.()}>중간 종료</button>
    <canvas ref={canvasRef} aria-label="숫자 캡슐 비행 화면: 1 좌상 빨강, 2 우상 노랑, 3 좌하 초록, 4 우하 파랑" style={{ display: 'block', width: '100%', height: '100%' }} />
  </section>;
}
