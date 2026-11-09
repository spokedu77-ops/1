'use client';

import { useEffect, useRef, useState } from 'react';
import { TrainingRuntimeHud } from './TrainingRuntimeHud';
import { ReactTrainStartCountdownOverlay, REACT_TRAIN_START_COUNTDOWN_SEC, runReactTrainStartCountdown } from '../lib/reactTrainStartCountdown';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { emptyColorStimulusCounts, type ColorStimulusCounts } from '../lib/trainingResultSummary';
import { generateSearchShapes, drawSearchSymbol, normalizeSearchReps, normalizeSearchSeconds, registerSearchTask,
  normalizeSearchStage, normalizeSearchTargetCount, isSearchSymbolOnlyRound, type VisualSearchStage, type VisualSearchTargetCount,
  searchShapePosition, VISUAL_SEARCH_REVEAL_SECONDS, VISUAL_SEARCH_ZONES } from '../lib/visualSearch';
import { spomovePerformance as performance, spomoveRequestAnimationFrame as requestAnimationFrame,
  spomoveCancelAnimationFrame as cancelAnimationFrame } from '../lib/runtimeClock';

type Props = {
  visualSearchStage?: VisualSearchStage;
  visualSearchTargetCount?: VisualSearchTargetCount;
  targetReps: number;
  searchSeconds: number;
  onComplete: (stats: ReactTrainCompleteStats) => void;
  onProgress: (count: number, counts: ColorStimulusCounts) => void;
};

export function VisualSearchReactionTraining({ targetReps, searchSeconds, visualSearchStage, visualSearchTargetCount, onComplete, onProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef<((stopped: boolean) => void) | null>(null);
  const callbacks = useRef({ onComplete, onProgress });
  useEffect(() => { callbacks.current = { onComplete, onProgress }; }, [onComplete, onProgress]);
  const [hud, setHud] = useState({ round: 0, remaining: REACT_TRAIN_START_COUNTDOWN_SEC, phase: 'countdown', zones: [] as number[], shapeCount: 0 });
  const stage = normalizeSearchStage(visualSearchStage);
  const targetCount = normalizeSearchTargetCount(stage, visualSearchTargetCount);
  const total = normalizeSearchReps(targetReps);
  const seconds = normalizeSearchSeconds(searchSeconds);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('시각탐색 Canvas를 시작할 수 없습니다.');
    let stopCountdown = () => {};
    let frame = 0;
    let done = false;
    let round = 0;
    let presented = 0;
    let phase: 'countdown' | 'search' | 'reveal' = 'countdown';
    const targetVariantOffset = stage === 2 ? Math.floor(Math.random() * 4) : 0;
    let phaseStart = performance.now();
    let shapes: ReturnType<typeof generateSearchShapes> = [];
    let counts = emptyColorStimulusCounts();
    let width = 1;
    let height = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const finish = (stopped: boolean, failed = false) => {
      if (done) return;
      done = true;
      stopCountdown();
      cancelAnimationFrame(frame);
      observer.disconnect();
      callbacks.current.onComplete({ stims: presented, maxCombo: 0,
        laneCount: [counts.red, counts.blue, counts.green, counts.yellow],
        completionReason: failed ? 'failed' : stopped ? (presented === 0 ? 'cancelled' : 'stopped_early') : 'natural_complete' });
    };
    finishRef.current = finish;
    const startRound = (now: number) => {
      round += 1;
      shapes = generateSearchShapes({ stage, targetCount, round, totalRounds: total, targetVariantOffset });
      phase = 'search'; phaseStart = now;
    };
    const tick = () => {
      if (done) return;
      const now = performance.now();
      let elapsed = (now - phaseStart) / 1000;
      if (phase === 'search' && elapsed >= seconds) { phase = 'reveal'; phaseStart = now; }
      else if (phase === 'reveal' && elapsed >= VISUAL_SEARCH_REVEAL_SECONDS) {
        if (round >= total) { finish(false); return; }
        startRound(now);
      }
      elapsed = (now - phaseStart) / 1000;
      const reveal = phase === 'reveal';
      const zones = shapes.filter(shape => shape.target).map(shape => shape.zone);
      const remaining = Math.max(0, (phase === 'search' ? seconds : 3) - elapsed);
      ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 4; i++) {
        const pad = VISUAL_SEARCH_ZONES[i]!;
        const x = (i % 2) * width / 2; const y = Math.floor(i / 2) * height / 2;
        ctx.fillStyle = pad.fill;
        ctx.fillRect(x, y, width / 2, height / 2);
        ctx.strokeStyle = reveal && zones.includes(i) ? '#F8FAFC' : pad.color;
        ctx.lineWidth = reveal && zones.includes(i) ? 6 : 2;
        ctx.strokeRect(x + 1, y + 1, width / 2 - 2, height / 2 - 2);
      }
      // Paint the target last so another stimulus cannot fully obscure it.
      for (const shape of [...shapes.filter(shape => !shape.target), ...shapes.filter(shape => shape.target)]) {
        const p = searchShapePosition(shape, stage, reveal ? seconds : elapsed);
        const x = p.x * width; const y = p.y * height;
        const radius = Math.min(width, height) * 0.022;
        ctx.globalAlpha = reveal && !shape.target ? 0.15 : 1;
        drawSearchSymbol(ctx, shape, x, y, radius);
        if (reveal && shape.target) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath();
          ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (presented < round) {
        presented = round;
        counts = registerSearchTask(counts, shapes);
        callbacks.current.onProgress(presented, counts);
      }
      setHud({ round, remaining, phase, zones, shapeCount: shapes.length });
      frame = requestAnimationFrame(safeTick);
    };
    const safeTick = () => {
      try { tick(); } catch { finish(true, true); }
    };
    stopCountdown = runReactTrainStartCountdown({
      onTick: remaining => setHud(current => ({ ...current, remaining })),
      onDone: () => {
        if (done) return;
        try { startRound(performance.now()); } catch { finish(true, true); }
      },
    });
    frame = requestAnimationFrame(safeTick);
    return () => { done = true; stopCountdown(); cancelAnimationFrame(frame); observer.disconnect(); finishRef.current = null; };
  }, [seconds, total, stage, targetCount]);

  const symbolOnly = isSearchSymbolOnlyRound(stage, Math.max(1, hud.round), total);
  return <section aria-label="복합 시각탐색 실행" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: '#111827', color: '#fff', overflowY: 'auto', wordBreak: 'keep-all' }}>
    <TrainingRuntimeHud flow onStop={() => finishRef.current?.(true)}>
      <span style={{ color: '#86EFAC' }}>REPS</span> {Math.max(0, total - Math.max(0, hud.round - 1))}
    </TrainingRuntimeHud>
    <div role="status" style={{ textAlign: 'center', padding: '8px 12px', minHeight: 56, flexShrink: 0, fontWeight: 700, fontSize: 'clamp(14px, 2vw, 18px)', visibility: hud.phase === 'countdown' ? 'hidden' : 'visible' }}>
      {hud.phase === 'countdown' ? `준비 ${Math.ceil(hud.remaining)}` : hud.phase === 'reveal'
        ? `정답 · 표시된 ${targetCount}곳으로 이동하세요`
        : `다른 기호 ${targetCount}개를 찾아 이동하세요 · ${hud.remaining.toFixed(1)}초`}
      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 5 }}>{stage}단계 · {stage === 1 ? '고정형' : '이동형'} · 목표 {targetCount}개 · 도형 {hud.shapeCount}개</div>
      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 5 }}>{symbolOnly ? '모양으로 찾기' : '색·모양으로 찾기'} · 탐색 {seconds}초 · 정답 공개 {VISUAL_SEARCH_REVEAL_SECONDS}초</div>
    </div>
    <div role="progressbar" aria-label="시각탐색 진행" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, hud.round - 1)}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.1)', zIndex: 20 }}>
      <div style={{ height: '100%', width: `${Math.max(0, hud.round - 1) / total * 100}%`, background: '#F97316', transition: 'width 0.1s linear', borderRadius: '0 2px 2px 0' }} />
    </div>
    <ReactTrainStartCountdownOverlay variant="standard" countdown={hud.phase === 'countdown' ? Math.max(1, Math.ceil(hud.remaining)) : 0} />
    <canvas ref={canvasRef} aria-label="왼쪽 위 빨강, 오른쪽 위 노랑, 왼쪽 아래 초록, 오른쪽 아래 파랑" style={{ display: 'block', width: '100%', flex: '1 0 280px', minHeight: 280 }} />
  </section>;
}
