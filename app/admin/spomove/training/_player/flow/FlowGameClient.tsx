'use client';

/**
 * Flow 2.0 — React 클라이언트
 *
 * 화면이 자동으로 달리는 착시 효과. 사용자는 화면을 보며 실제 신체 동작을 수행.
 * 키보드·터치·버튼 조작 없음. ✕ 나가기 버튼만 존재.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FlowEngine, type FlowGamePhase, type FlowStats } from './engine/FlowEngine';
import { FLOW_MODULES } from './engine/modules/flowModules';
import type { FlowStageConfig } from './engine/modules/stageBuilder';

interface FlowGameClientProps {
  stages:       FlowStageConfig[];
  colorTheme?:  'default' | 'space' | 'neon';
  motionScale?: number;
  bgmPath?:     string;
  onComplete:   (stats: FlowStats) => void;
  onExit:       () => void;
}

const S = {
  root: {
    position: 'fixed' as const,
    inset: 0,
    background: '#000',
    overflow: 'hidden',
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
  },
  canvas: { width: '100%', height: '100%', display: 'block' as const },
  overlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '0 1.5rem',
  },
};

export default function FlowGameClient({
  stages,
  colorTheme = 'default',
  motionScale = 1,
  bgmPath,
  onComplete,
  onExit,
}: FlowGameClientProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const flashRef       = useRef<HTMLDivElement>(null);
  const engineRef      = useRef<FlowEngine | null>(null);
  const instrTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const balTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase,          setPhase]         = useState<FlowGamePhase>('idle');
  const [countdown,      setCountdown]     = useState<number | null>(null);
  const [stageIdx,       setStageIdx]      = useState(0);
  const [timerSec,       setTimerSec]      = useState(stages[0]?.durationSec ?? 25);
  const [instruction,    setInstruction]   = useState<{ text: string; cls: string } | null>(null);
  const [balanceCue,     setBalanceCue]    = useState<'left' | 'right' | null>(null);
  const [stats,          setStats]         = useState<FlowStats | null>(null);
  const [totalProgress,  setTotalProgress] = useState(0);

  // ── 엔진 초기화 ────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stages.length === 0) return;

    const engine = new FlowEngine(
      canvas,
      {
        onPhaseChange:  (p) => setPhase(p),
        onCountdown:    (n) => setCountdown(n),
        onStageChange:  (idx) => {
          setStageIdx(idx);
          setTimerSec(stages[idx]?.durationSec ?? 25);
        },
        onTimerUpdate:  (rem, prog) => {
          setTimerSec(rem);
          setTotalProgress(prog);
        },
        onInstruction:  (text, colorClass, ms) => {
          if (instrTimerRef.current) clearTimeout(instrTimerRef.current);
          setInstruction({ text, cls: colorClass });
          instrTimerRef.current = setTimeout(() => setInstruction(null), ms);
        },
        onComplete:     (s) => { setStats(s); onComplete(s); },
        onBalanceCue:   (foot) => {
          setBalanceCue(foot);
          if (balTimerRef.current) clearTimeout(balTimerRef.current);
          balTimerRef.current = setTimeout(() => setBalanceCue(null), 2500);
        },
        onCameraShake:  () => {},
        onFlash:        () => {},
      },
      { stages, colorTheme, motionScale, bgmPath },
    );

    engineRef.current = engine;
    engine.init(flashRef.current).then(() => engine.start());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages.length, colorTheme, motionScale, bgmPath]);

  // ── 리사이즈 ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onResize = () => engineRef.current?.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleExit = useCallback(() => {
    engineRef.current?.stop();
    onExit();
  }, [onExit]);

  // ── 현재 스테이지 ───────────────────────────────────────────────────────────

  const currentStage = stages[stageIdx];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={S.root}>

      {/* Three.js 렌더 타겟 */}
      <canvas ref={canvasRef} style={S.canvas} />

      {/* 화이트 플래시 오버레이 */}
      <div
        ref={flashRef}
        style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, pointerEvents: 'none' }}
      />

      {/* ─── HUD (playing) ────────────────────────────────────────────────── */}
      {phase === 'playing' && currentStage && (
        <>
          {/* 스테이지 진행 도트 */}
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 7 }}>
            {stages.map((s, i) => (
              <div
                key={i}
                style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: i < stageIdx ? s.color : i === stageIdx ? '#fff' : 'rgba(255,255,255,0.2)',
                  border: i === stageIdx ? `2px solid ${s.color}` : '1px solid rgba(255,255,255,0.25)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>

          {/* 스테이지 라벨 + 타이머 */}
          <div style={{ position: 'absolute', bottom: 18, left: 16, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.65rem', color: currentStage.color, fontWeight: 800, letterSpacing: '0.2em', padding: '0.15rem 0.6rem', borderRadius: '9999px', border: `1px solid ${currentStage.colorBorder}`, background: currentStage.colorBg }}>
              STAGE {currentStage.stageNum}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
              {Math.ceil(timerSec)}s
            </span>
          </div>

          {/* 전체 진행 바 */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
            <div style={{ height: '100%', width: `${totalProgress * 100}%`, background: currentStage.color, transition: 'width 0.12s linear' }} />
          </div>

          {/* 지시어 플래시 — 크고 명확하게 */}
          {instruction && (
            <div
              className={instruction.cls}
              style={{
                position: 'absolute',
                top: '35%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 'clamp(3rem, 10vw, 5rem)',
                fontWeight: 900,
                pointerEvents: 'none',
                letterSpacing: '0.08em',
                textShadow: '0 0 50px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap',
                animation: 'flowInstPop 0.15s ease-out',
              }}
            >
              {instruction.text}
            </div>
          )}

          {/* 밸런스 큐 */}
          {balanceCue && (
            <div style={{
              position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)',
              fontSize: '1.6rem', fontWeight: 800, color: '#86efac',
              background: 'rgba(0,0,0,0.65)', padding: '0.35rem 1.4rem', borderRadius: '2rem',
              letterSpacing: '0.05em',
            }}>
              {balanceCue === 'left' ? '← 왼발!' : '오른발 →'}
            </div>
          )}
        </>
      )}

      {/* ─── 카운트다운 ──────────────────────────────────────────────────── */}
      {phase === 'countdown' && countdown !== null && (
        <div style={{ ...S.overlay, background: 'rgba(0,0,0,0.72)' }}>
          <div style={{
            fontSize: countdown > 0 ? '9rem' : '4rem',
            fontWeight: 900,
            color: countdown > 0 ? '#fff' : '#22d3ee',
            lineHeight: 1,
          }}>
            {countdown > 0 ? countdown : 'GO!'}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
            준비하세요
          </p>
        </div>
      )}

      {/* ─── 스테이지 인트로 ─────────────────────────────────────────────── */}
      {phase === 'stage-intro' && currentStage && (
        <div style={{ ...S.overlay, background: 'rgba(0,0,0,0.84)' }}>
          <p style={{ fontSize: '0.65rem', color: currentStage.color, fontWeight: 800, letterSpacing: '0.35em', marginBottom: '0.5rem' }}>
            {currentStage.label}
          </p>
          <h2 style={{
            fontSize: '3rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem',
            fontFamily: "'Black Han Sans',sans-serif", letterSpacing: '0.06em',
          }}>
            {currentStage.cueWord}
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', maxWidth: 300, lineHeight: 1.55 }}>
            {currentStage.shortInstruction}
          </p>

          {currentStage.activeModules.size > 1 && (
            <div style={{ marginTop: '1.4rem', display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 320 }}>
              {[...currentStage.activeModules].map((key) => {
                const mod = FLOW_MODULES[key];
                return (
                  <span
                    key={key}
                    style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.6rem', borderRadius: '9999px', border: `1px solid ${mod.colorBorder}`, color: mod.color, background: mod.colorBg }}
                  >
                    {mod.icon} {mod.tag}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 완료 ────────────────────────────────────────────────────────── */}
      {phase === 'complete' && stats && (
        <div style={{ ...S.overlay, background: 'rgba(0,0,0,0.90)' }}>
          <p style={{ fontSize: '0.65rem', color: '#22d3ee', fontWeight: 800, letterSpacing: '0.35em', marginBottom: '0.5rem' }}>
            COMPLETE
          </p>
          <h2 style={{ fontSize: '2.8rem', fontWeight: 900, color: '#fff', marginBottom: '0.6rem', fontFamily: "'Black Han Sans',sans-serif" }}>
            FLOW DONE!
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '2rem' }}>
            <span>{stats.stagesCompleted} / {stages.length} 스테이지</span>
            <span> · {Math.round(stats.totalSec)}초</span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300, marginBottom: '2rem' }}>
            {stages.map((s) => {
              const mod = FLOW_MODULES[s.newModule];
              return (
                <span key={s.stageIndex} style={{ fontSize: '0.65rem', padding: '0.15rem 0.55rem', borderRadius: '9999px', border: `1px solid ${mod.colorBorder}`, color: mod.color, background: mod.colorBg }}>
                  {mod.icon} {mod.tag}
                </span>
              );
            })}
          </div>

          <button
            onClick={onExit}
            style={{ padding: '0.65rem 2.2rem', borderRadius: '1rem', border: '2px solid #22d3ee', background: 'rgba(34,211,238,0.12)', color: '#22d3ee', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit' }}
          >
            나가기
          </button>
        </div>
      )}

      {/* ─── 나가기 버튼 (항상) ──────────────────────────────────────────── */}
      {phase !== 'complete' && (
        <button
          onClick={handleExit}
          style={{ position: 'absolute', top: 10, right: 14, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', borderRadius: '0.5rem', padding: '0.25rem 0.65rem', fontSize: '0.72rem', cursor: 'pointer' }}
        >
          ✕ 나가기
        </button>
      )}

      <style>{`
        @keyframes flowInstPop {
          from { transform: translate(-50%, -50%) scale(0.7); opacity: 0.4; }
          to   { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
