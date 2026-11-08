'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { emptyColorStimulusCounts, type ColorStimulusCounts } from '../lib/trainingResultSummary';
import { generateSearchShapes, normalizeSearchReps, normalizeSearchSeconds, registerSearchTask,
  searchShapePosition, VISUAL_SEARCH_REVEAL_SECONDS, VISUAL_SEARCH_ZONES } from '../lib/visualSearch';
import { spomovePerformance as performance, spomoveRequestAnimationFrame as requestAnimationFrame,
  spomoveCancelAnimationFrame as cancelAnimationFrame } from '../lib/runtimeClock';

type Props = {
  targetReps: number;
  searchSeconds: number;
  onComplete: (stats: ReactTrainCompleteStats) => void;
  onProgress: (count: number, counts: ColorStimulusCounts) => void;
};

export function VisualSearchReactionTraining({ targetReps, searchSeconds, onComplete, onProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef<((stopped: boolean) => void) | null>(null);
  const callbacks = useRef({ onComplete, onProgress });
  useEffect(() => { callbacks.current = { onComplete, onProgress }; }, [onComplete, onProgress]);
  const [hud, setHud] = useState({ round: 0, remaining: 3, phase: 'countdown', zone: 0 });
  const total = normalizeSearchReps(targetReps);
  const seconds = normalizeSearchSeconds(searchSeconds);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('시각탐색 Canvas를 시작할 수 없습니다.');
    let frame = 0;
    let done = false;
    let round = 0;
    let presented = 0;
    let phase: 'countdown' | 'search' | 'reveal' = 'countdown';
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
      cancelAnimationFrame(frame);
      observer.disconnect();
      callbacks.current.onComplete({ stims: presented, maxCombo: 0,
        laneCount: [counts.red, counts.blue, counts.green, counts.yellow],
        completionReason: failed ? 'failed' : stopped ? (presented === 0 ? 'cancelled' : 'stopped_early') : 'natural_complete' });
    };
    finishRef.current = finish;
    const startRound = (now: number) => {
      round += 1;
      shapes = generateSearchShapes(round);
      phase = 'search'; phaseStart = now;
    };
    const tick = () => {
      if (done) return;
      const now = performance.now();
      let elapsed = (now - phaseStart) / 1000;
      if (phase === 'countdown' && elapsed >= 3) startRound(now);
      else if (phase === 'search' && elapsed >= seconds) { phase = 'reveal'; phaseStart = now; }
      else if (phase === 'reveal' && elapsed >= VISUAL_SEARCH_REVEAL_SECONDS) {
        if (round >= total) { finish(false); return; }
        startRound(now);
      }
      elapsed = (now - phaseStart) / 1000;
      const reveal = phase === 'reveal';
      const target = shapes.find(shape => shape.target);
      const zone = target?.zone ?? 0;
      const remaining = Math.max(0, (phase === 'search' ? seconds : 3) - elapsed);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 4; i++) {
        const pad = VISUAL_SEARCH_ZONES[i]!;
        const x = (i % 2) * width / 2; const y = Math.floor(i / 2) * height / 2;
        ctx.fillStyle = pad.color + (reveal && zone === i ? '44' : '0c');
        ctx.fillRect(x, y, width / 2, height / 2);
        ctx.strokeStyle = pad.color + '88'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, width / 2 - 2, height / 2 - 2);
        ctx.fillStyle = pad.color; ctx.font = '700 16px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(pad.name, x + 12, y + 24);
      }
      // Paint the target last so another stimulus cannot fully obscure it.
      for (const shape of [...shapes.filter(shape => !shape.target), ...shapes.filter(shape => shape.target)]) {
        const p = searchShapePosition(shape, round, reveal ? seconds : elapsed);
        const x = p.x * width; const y = p.y * height;
        const radius = Math.min(width, height) * 0.024;
        ctx.globalAlpha = reveal && !shape.target ? 0.15 : 1;
        ctx.fillStyle = shape.color === 'red' ? '#ef4444' : '#3b82f6';
        ctx.beginPath();
        if (shape.type === 'circle') ctx.arc(x, y, radius, 0, Math.PI * 2);
        else ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.fill(); ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1; ctx.stroke();
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
      setHud({ round, remaining, phase, zone });
      frame = requestAnimationFrame(safeTick);
    };
    const safeTick = () => {
      try { tick(); } catch { finish(true, true); }
    };
    frame = requestAnimationFrame(safeTick);
    return () => { done = true; cancelAnimationFrame(frame); observer.disconnect(); finishRef.current = null; };
  }, [seconds, total]);

  return <section aria-label="복합 시각탐색 실행" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#fff' }}>
    <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 16px', flexShrink: 0 }}>
      <strong>복합 시각탐색</strong><span>{hud.round} / {total}회</span>
      <span style={{ marginLeft: 'auto' }}>{hud.round < 3 ? '단순 탐색' : hud.round < 5 ? '복합 탐색' : '이동 탐색'}</span>
      <button type="button" onClick={() => finishRef.current?.(true)} style={{ minHeight: 44, padding: '8px 16px', background: 'transparent', color: '#fff', border: '1px solid #64748b', borderRadius: 8 }}>중간 종료</button>
    </header>
    <div role="status" style={{ textAlign: 'center', padding: '8px 12px', minHeight: 64, fontWeight: 800, fontSize: 'clamp(16px, 2.3vw, 28px)' }}>
      {hud.phase === 'countdown' ? `준비 ${Math.ceil(hud.remaining)}` : hud.phase === 'reveal'
        ? `정답 · ${VISUAL_SEARCH_ZONES[hud.zone]!.name} 구역`
        : `${hud.round < 3 ? '빨간 원' : '파란 사각형'} 1개를 찾아 이동하세요 · ${hud.remaining.toFixed(1)}초`}
      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 5 }}>탐색 {seconds}초 · 정답 공개 {VISUAL_SEARCH_REVEAL_SECONDS}초</div>
    </div>
    <canvas ref={canvasRef} aria-label="왼쪽 위 빨강, 오른쪽 위 노랑, 왼쪽 아래 초록, 오른쪽 아래 파랑" style={{ display: 'block', width: '100%', flex: '1 1 0', minHeight: 0 }} />
  </section>;
}
