'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { emptyColorStimulusCounts, type ColorStimulusCounts } from '../lib/trainingResultSummary';
import { createNumberReaderTrial, normalizeNumberReaderReps, normalizeNumberReaderSeconds,
  numberReaderPhaseSeconds, NUMBER_READER_ZONES, type NumberReaderPhase } from '../lib/movingNumberReader';
import { drawNumberReaderFrame } from '../lib/movingNumberReaderCanvas';
import { ReactTrainStartCountdownOverlay, REACT_TRAIN_START_COUNTDOWN_SEC, runReactTrainStartCountdown } from '../lib/reactTrainStartCountdown';
import { spomovePerformance as performance, spomoveRequestAnimationFrame as requestAnimationFrame,
  spomoveCancelAnimationFrame as cancelAnimationFrame } from '../lib/runtimeClock';

type Props = {
  targetReps: number;
  flightSeconds: number;
  onProgress: (presented: number, counts: ColorStimulusCounts) => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

export function MovingNumberReaderTraining({ targetReps, flightSeconds, onProgress, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onProgress, onComplete });
  useEffect(() => { callbacks.current = { onProgress, onComplete }; }, [onProgress, onComplete]);
  const [hud, setHud] = useState({ phase: 'READY' as NumberReaderPhase, round: 1, remaining: 1.5, number: 0 });
  const [countdown, setCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const total = normalizeNumberReaderReps(targetReps);
  const seconds = normalizeNumberReaderSeconds(flightSeconds);

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('숫자 캡슐 Canvas를 시작할 수 없습니다.');
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
      if (now - phaseStart >= numberReaderPhaseSeconds(phase, seconds) * 1000) {
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
      const duration = numberReaderPhaseSeconds(phase, seconds);
      const visible = drawNumberReaderFrame(ctx, width, height, trial, round, phase, elapsed / duration, now, seconds);
      if (visible && !shown) {
        shown = true; presented += 1;
        const id = NUMBER_READER_ZONES[trial.number - 1]!.id;
        counts = { ...counts, [id]: counts[id] + 1 };
        callbacks.current.onProgress(presented, counts);
      }
      setHud({ phase, round, remaining: Math.max(0, duration - elapsed), number: phase === 'REVEAL' ? trial.number : 0 });
      frame = requestAnimationFrame(safeTick);
    };
    const safeTick = () => { try { tick(); } catch { finish('failed'); } };
    const stopCountdown = runReactTrainStartCountdown({ onTick:setCountdown, onDone:() => { started = true; phaseStart = performance.now(); } });
    frame = requestAnimationFrame(safeTick);
    return () => { done = true; stopCountdown(); cancelAnimationFrame(frame); observer.disconnect(); stopRef.current = null; };
  }, [seconds, total]);

  return <section aria-label="움직이는 숫자 판별 실행" style={{ position:'relative', height: '100%', display: 'flex', flexDirection: 'column', background: '#020617', color: '#fff' }}>
    <ReactTrainStartCountdownOverlay countdown={countdown} />
    <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 16px', alignItems: 'center', flexShrink: 0 }}>
      <strong>움직이는 숫자 판별</strong><span>{hud.round} / {total}회</span>
      <span style={{ marginLeft: 'auto', color: '#7dd3fc' }}>비행 {seconds}초</span>
      <button type="button" onClick={() => stopRef.current?.()} style={{ minHeight: 44, padding: '8px 16px', border: '1px solid #64748b', borderRadius: 8, color: '#fff', background: 'transparent' }}>중간 종료</button>
    </header>
    <div role="status" style={{ padding: '8px 12px', textAlign: 'center', minHeight: 68, fontWeight: 800, fontSize: 'clamp(16px,2.2vw,28px)' }}>
      {hud.phase === 'READY' ? '물체 추적 준비' : hud.phase === 'FLY' ? '캡슐 안의 숫자를 읽으세요' : hud.phase === 'ACTION' ? '방금 본 숫자의 구역으로 이동하세요' : `정답 · ${hud.number}번 ${NUMBER_READER_ZONES[hud.number - 1]?.name ?? ''} 구역`}
      <div style={{ fontSize: 13, marginTop: 6, color: '#94a3b8' }}>{hud.phase} · {hud.remaining.toFixed(1)}초</div>
    </div>
    <canvas ref={canvasRef} aria-label="숫자 캡슐 비행 화면: 1 좌상 빨강, 2 우상 노랑, 3 좌하 초록, 4 우하 파랑" style={{ display: 'block', width: '100%', flex: '1 1 0', minHeight: 0 }} />
  </section>;
}
