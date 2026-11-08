'use client';

import { useEffect, useRef, useState } from 'react';
import { advanceGlassBridge, createGlassBridgeState, glassBridgeLitIndex, judgeGlassBridge, GLASS_BRIDGE_COLORS,
  normalizeGlassBridgeLength, normalizeGlassBridgeRounds, normalizeGlassBridgeSeconds,
  type GlassBridgeComplete, type GlassBridgeResult, type GlassBridgeState } from '../lib/glassBridgeMemory';
import { createGlassBridgeVisuals, drawGlassBridge } from '../lib/glassBridgeCanvas';
import { createGlassBridgeAudio } from '../lib/glassBridgeAudio';
import { spomovePerformance as performance, spomoveRequestAnimationFrame as requestAnimationFrame,
  spomoveCancelAnimationFrame as cancelAnimationFrame } from '../lib/runtimeClock';

type Props = {
  startLength: number; cueSeconds: number; targetRounds: number; effectsEnabled: boolean;
  onProgress: (stats: GlassBridgeResult) => void;
  onComplete: (stats: GlassBridgeComplete) => void;
};

export function GlassBridgeMemoryTraining({ startLength, cueSeconds, targetRounds, effectsEnabled, onProgress, onComplete }: Props) {
  const length = normalizeGlassBridgeLength(startLength); const seconds = normalizeGlassBridgeSeconds(cueSeconds);
  const total = normalizeGlassBridgeRounds(targetRounds);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actions = useRef<{ judge: (success: boolean) => void; stop: () => void } | null>(null);
  const callbacks = useRef({ onProgress, onComplete });
  useEffect(() => { callbacks.current = { onProgress, onComplete }; }, [onProgress, onComplete]);
  const [view, setView] = useState(() => createGlassBridgeState(length, seconds, total, 0));

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('기억의 유리 다리 Canvas를 시작할 수 없습니다.');
    let state = createGlassBridgeState(length, seconds, total, performance.now());
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
      done = true; cancelAnimationFrame(frame); observer.disconnect(); audio.close();
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
      judge: success => { if (!done) commit(judgeGlassBridge(state, success, performance.now())); },
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
    setView(state); callbacks.current.onProgress({ ...state.result }); frame = requestAnimationFrame(tick);
    return () => { done = true; cancelAnimationFrame(frame); observer.disconnect(); audio.close(); actions.current = null; };
  }, [length, seconds, total, effectsEnabled]);

  const waiting = view.phase === 'WAITING';
  const message = view.phase === 'READY' ? '순서를 기억하세요!' : waiting ? 'GO! 스텝을 밟으세요!'
    : view.phase === 'SUCCESS' ? '성공!' : view.phase === 'REVEAL' ? '정답은 이것!' : view.phase === 'SHATTER' ? '다리 붕괴! 실패!' : '';
  const buttonStyle = { minHeight: 48, padding: '10px 22px', borderRadius: 12, border: '1px solid #ffffff55', color: '#fff', fontWeight: 800, opacity: waiting ? 1 : 0.35, cursor: waiting ? 'pointer' : 'default' };
  return <section aria-label="기억의 유리 다리 실행" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#05050a', color: '#fff' }}>
    <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '10px 16px', flexShrink: 0 }}>
      <strong>기억의 유리 다리</strong><span>LEVEL {view.round} · {view.round} / {total}라운드</span>
      <span style={{ marginLeft: 'auto', color: '#67e8f9' }}>기억할 패턴: {view.length}개</span>
      <button type="button" onClick={() => actions.current?.stop()} style={{ minHeight: 44, padding: '8px 14px', border: '1px solid #64748b', borderRadius: 8, color: '#fff', background: 'transparent' }}>중간 종료</button>
    </header>
    <div style={{ flex: '1 1 0', minHeight: 0, position: 'relative' }}>
      <canvas ref={canvasRef} aria-label="아래에서 위로 순서대로 점등되는 세로 유리 발판" style={{ width: '100%', height: '100%', display: 'block' }} />
      <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center', padding: 12,
        fontSize: 'clamp(24px,5vw,64px)', fontWeight: 900, textShadow: '0 0 20px #fff,0 3px 12px #000', color: view.phase === 'SHATTER' ? '#f87171' : '#fff' }}>{message}</div>
    </div>
    <footer style={{ padding: '10px 12px max(12px,env(safe-area-inset-bottom))', textAlign: 'center', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        <button type="button" disabled={!waiting} onClick={() => actions.current?.judge(true)} style={{ ...buttonStyle, background: '#15803d' }}>성공</button>
        <button type="button" disabled={!waiting} onClick={() => actions.current?.judge(false)} style={{ ...buttonStyle, background: '#b91c1c' }}>실패</button>
      </div>
      <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 12 }}>교사 판정 · 발판당 {seconds}초 · 제시 완료 {view.result.presentedRounds}라운드 · 성공 {view.result.successRounds}라운드</p>
    </footer>
  </section>;
}
