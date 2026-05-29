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
  stages:         FlowStageConfig[];
  colorTheme?:    'default' | 'space' | 'neon' | 'ocean';
  motionScale?:   number;
  bgmPath?:       string;
  onComplete:     (stats: FlowStats) => void;
  onExit:         () => void;
  onEngineReady?: (api: { loadBgmLate: (path: string) => Promise<void> }) => void;
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
  onEngineReady,
}: FlowGameClientProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const flashRef       = useRef<HTMLDivElement>(null);
  const engineRef      = useRef<FlowEngine | null>(null);
  const instrTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instrPrioRef   = useRef(0);

  const [phase,          setPhase]         = useState<FlowGamePhase>('idle');
  const [countdown,      setCountdown]     = useState<number | null>(null);
  const [stageIdx,       setStageIdx]      = useState(0);
  const [timerSec,       setTimerSec]      = useState(stages[0]?.durationSec ?? 25);
  const [instruction,    setInstruction]   = useState<{ text: string; cls: string } | null>(null);
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
        onInstruction:  (text, colorClass, ms, priority = 1) => {
          // 우선순위가 낮은 지시문은 현재 표시 중인 것을 덮어쓰지 않음
          if (instrTimerRef.current && priority < instrPrioRef.current) return;
          if (instrTimerRef.current) clearTimeout(instrTimerRef.current);
          instrPrioRef.current = priority;
          setInstruction({ text, cls: colorClass });
          instrTimerRef.current = setTimeout(() => {
            setInstruction(null);
            instrPrioRef.current = 0;
          }, ms);
        },
        onComplete:     (s) => { setStats(s); onComplete(s); },
        onCameraShake:  () => {},
        onFlash:        () => {},
      },
      { stages, colorTheme, motionScale, bgmPath },
    );

    engineRef.current = engine;
    engine.init(flashRef.current).then(() => {
      onEngineReady?.({ loadBgmLate: (p) => engine.loadBgmLate(p) });
      engine.start();
    });

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

          {/* 지시어 플래시 */}
          {instruction && (
            <div
              className={instruction.cls}
              style={{
                position: 'absolute',
                top: '35%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 'clamp(3.5rem, 12vw, 6rem)',
                fontWeight: 900,
                fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif",
                pointerEvents: 'none',
                letterSpacing: '0.06em',
                textShadow: '0 0 60px rgba(255,255,255,0.9), 0 0 25px rgba(255,255,255,0.6)',
                whiteSpace: 'nowrap',
                animation: 'flowInstPop 0.12s ease-out',
              }}
            >
              {instruction.text}
            </div>
          )}
        </>
      )}

      {/* ─── 스테이지 인트로 (게임 정지, 5초) ─────────────────────────── */}
      {phase === 'stage-intro' && currentStage && (
        <div style={{ ...S.overlay, background: currentStage.isBonus ? 'rgba(40,30,0,0.95)' : 'rgba(0,0,0,0.90)' }}>
          <p style={{ fontSize: '0.6rem', color: currentStage.color, fontWeight: 800, letterSpacing: '0.4em', marginBottom: '0.6rem' }}>
            {currentStage.isBonus ? '🏆 BONUS STAGE' : currentStage.label}
          </p>
          <h2 style={{
            fontSize: 'clamp(2.5rem, 8vw, 4rem)', fontWeight: 900, color: '#fff',
            fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif",
            letterSpacing: '0.06em', marginBottom: '0.6rem',
          }}>
            {currentStage.cueWord}
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', maxWidth: 320, lineHeight: 1.6 }}>
            {currentStage.shortInstruction}
          </p>
          <div style={{ marginTop: '1.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 }}>
            {[...currentStage.activeModules].filter(k => k !== 'jump').map((key) => {
              const mod = FLOW_MODULES[key];
              return (
                <span key={key} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.7rem', borderRadius: '9999px', border: `1px solid ${mod.colorBorder}`, color: mod.color, background: mod.colorBg }}>
                  {mod.icon} {mod.tag}
                </span>
              );
            })}
          </div>
        </div>
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
        @keyframes stageIntroPop {
          from { transform: translateX(-50%) scale(0.88) translateY(-8px); opacity: 0; }
          to   { transform: translateX(-50%) scale(1)    translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
