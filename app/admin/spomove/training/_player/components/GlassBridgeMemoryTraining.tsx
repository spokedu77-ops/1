'use client';

import { useEffect, useRef, useState } from 'react';
import { advanceGlassBridge, createGlassBridgeState, glassBridgeLitIndex, answerGlassBridge, GLASS_BRIDGE_COLORS,
  normalizeGlassBridgeLength, normalizeGlassBridgeRounds, normalizeGlassBridgeSeconds,
  type GlassBridgeDifficulty, type GlassBridgeColor, type GlassBridgeComplete, type GlassBridgeResult, type GlassBridgeState } from '../lib/glassBridgeMemory';
import { createGlassBridgeVisuals, drawGlassBridge } from '../lib/glassBridgeCanvas';
import { createGlassBridgeAudio } from '../lib/glassBridgeAudio';
import { ReactTrainStartCountdownOverlay, REACT_TRAIN_START_COUNTDOWN_SEC, runReactTrainStartCountdown } from '../lib/reactTrainStartCountdown';
import { COLORS } from '../constants';
import { TrainingRuntimeHud } from './TrainingRuntimeHud';
import { spomovePerformance as performance, spomoveRequestAnimationFrame as requestAnimationFrame,
  spomoveCancelAnimationFrame as cancelAnimationFrame } from '../lib/runtimeClock';

type Props = {
  difficulty?: GlassBridgeDifficulty; startLength: number; cueSeconds: number; targetRounds: number; effectsEnabled: boolean;
  onProgress: (stats: GlassBridgeResult) => void;
  onComplete: (stats: GlassBridgeComplete) => void;
};

export function GlassBridgeMemoryTraining({ difficulty = 'hard', startLength, cueSeconds, targetRounds, effectsEnabled, onProgress, onComplete }: Props) {
  const length = normalizeGlassBridgeLength(startLength); const seconds = normalizeGlassBridgeSeconds(cueSeconds);
  const total = normalizeGlassBridgeRounds(targetRounds);
  const [countdown, setCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actions = useRef<{ answer: (color: GlassBridgeColor) => void; stop: () => void } | null>(null);
  const callbacks = useRef({ onProgress, onComplete });
  useEffect(() => { callbacks.current = { onProgress, onComplete }; }, [onProgress, onComplete]);
  const [view, setView] = useState(() => createGlassBridgeState(length, seconds, total, 0, Math.random, difficulty));

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('기억의 유리 다리 Canvas를 시작할 수 없습니다.');
    let state = createGlassBridgeState(length, seconds, total, performance.now(), Math.random, difficulty);
    let cancelCountdown = () => {};
    let done = false; let frame = 0; let width = 1; let height = 1; let lastFlash = '';
    const visuals = createGlassBridgeVisuals(); const audio = createGlassBridgeAudio(effectsEnabled);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resize = () => {
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const finish = (reason: GlassBridgeComplete['completionReason']) => {
      if (done) return;
      done = true; cancelCountdown(); cancelAnimationFrame(frame); observer.disconnect(); audio.close();
      callbacks.current.onComplete({ ...state.result, completionReason: reason });
    };
    const commit = (next: GlassBridgeState) => {
      if (next === state) return;
      if (next.phase !== state.phase) {
        if (next.phase === 'WAITING') audio.play('go');
        if (next.phase === 'SUCCESS') audio.play('success');
        if (next.phase === 'SHATTER') audio.play('shatter');
      }
      state = next; setView(next); callbacks.current.onProgress({ ...next.result });
    };
    actions.current = {
      answer: color => { if (!done) commit(answerGlassBridge(state, color, performance.now())); },
      stop: () => finish(state.phase === 'READY' && state.round === 1 ? 'cancelled' : 'stopped_early'),
    };
    const tick = () => {
      if (done) return;
      try {
        const now = performance.now(); commit(advanceGlassBridge(state, now));

        if (state.phase === 'COMPLETED') { finish('natural_complete'); return; }
        if (state.phase === 'STOPPED') { finish('stopped_early'); return; }
        drawGlassBridge(ctx, width, height, state, now, visuals, reducedMotion);
        const lit = glassBridgeLitIndex(state, now);
        const key = `${state.round}:${lit}`;
        if (lit >= 0 && key !== lastFlash) audio.play('flash', GLASS_BRIDGE_COLORS.indexOf(state.pattern[lit]!));
        lastFlash = key; frame = requestAnimationFrame(tick);
      } catch { finish('failed'); }
    };
    cancelCountdown = runReactTrainStartCountdown({ onTick: setCountdown, onDone: () => { if (!done) commit(advanceGlassBridge(state, performance.now())); } });
    setView(state); callbacks.current.onProgress({ ...state.result }); frame = requestAnimationFrame(tick);
    return () => { done = true; cancelCountdown(); cancelAnimationFrame(frame); observer.disconnect(); audio.close(); actions.current = null; };
  }, [length, seconds, total, effectsEnabled, difficulty]);

  const waiting = view.phase === 'WAITING';
  const completed = view.result.completedRounds ?? 0;
  const message = view.phase === 'READY' ? '순서를 기억하세요' : waiting ? `${view.answerIndex + 1}번째 발판 · 이동한 색을 선택하세요`
    : view.phase === 'SUCCESS' ? '정답입니다!' : view.phase === 'SHATTER' ? '정답을 확인하고 다음 발판으로!' : difficulty === 'easy' ? '전체 색상을 20초 동안 기억하세요' : '색상 순서를 기억하세요';
  return <section aria-label="기억의 유리 다리 실행" style={{ height: '100%', position: 'relative', boxSizing: 'border-box', paddingTop: 88, display: 'flex', flexDirection: 'column', background: '#05050a', color: '#fff', overflowY: 'auto', wordBreak: 'keep-all' }}>
    <TrainingRuntimeHud onStop={() => actions.current?.stop()}>
      <span style={{ color: '#86EFAC' }}>REPS</span> {total - completed}
    </TrainingRuntimeHud>
    <div style={{ textAlign: 'center', padding: '0 12px 8px', flexShrink: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{view.length}칸 기억하기 · {view.round} / {total}라운드</div>
      <div role="status" style={{ minHeight: 24, marginTop: 6, fontSize: 13, color: view.phase === 'SHATTER' ? '#fca5a5' : '#cbd5e1' }}>{message}</div>
    </div>
    <div style={{ flex: '1 0 250px', minHeight: 250, display: 'flex', minWidth: 0 }}>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <canvas ref={canvasRef} aria-label="아래에서 위로 순서대로 점등되는 세로 유리 발판" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <aside role="group" aria-label="이동한 색 선택" style={{ width: 'clamp(64px,12vw,100px)', flexShrink: 0, padding: '8px 10px 8px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
        {(['red', 'yellow', 'green', 'blue'] as const).map(id => {
          const color = COLORS.find(item => item.id === id)!;
          return <button key={id} type="button" aria-label={`${color.name} 선택`} disabled={!waiting} onClick={() => actions.current?.answer(id)}
            style={{ height: 52, minHeight: 44, borderRadius: 10, border: '2px solid #ffffff77', background: color.bg, opacity: waiting ? 1 : 0.4, cursor: waiting ? 'pointer' : 'default' }} />;
        })}
      </aside>
    </div>
    <p style={{ margin: '8px 0 12px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>맞힌 발판 {view.result.correctSteps ?? 0} · 틀린 발판 {view.result.incorrectSteps ?? 0}</p>
    <ReactTrainStartCountdownOverlay countdown={countdown} variant="standard" />
    <div role="progressbar" aria-label="라운드 진행" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} style={{ height: 5, flexShrink: 0, background: 'rgba(255,255,255,0.1)' }}>
      <div style={{ height: '100%', width: `${completed / total * 100}%`, background: '#F97316' }} />
    </div>
  </section>;
}
