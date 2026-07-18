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
import ColorGateHud from './components/ColorGateHud';
import {
  buildColorGateCue,
  buildColorGateInstruction,
  COLOR_GATE_POSE_LABELS,
  preloadColorGatePoseImages,
  type ColorGatePoseKey,
  type GateColorId,
} from './engine/modules/colorGateGuides';

interface FlowGameClientProps {
  stages:            FlowStageConfig[];
  motionScale?:      number;
  bgmPath?:          string;
  panoramaHighUrl?:  string;
  panoramaLowUrl?:   string;
  panoramaYawDeg?:   number;
  onComplete:        (stats: FlowStats) => void;
  onExit:            () => void;
  onEngineReady?:    (api: { loadBgmLate: (path: string) => Promise<void> }) => void;
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
  motionScale = 1,
  bgmPath,
  panoramaHighUrl,
  panoramaLowUrl,
  panoramaYawDeg,
  onComplete,
  onExit,
  onEngineReady,
}: FlowGameClientProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const flashRef     = useRef<HTMLDivElement>(null);
  const engineRef    = useRef<FlowEngine | null>(null);
  const initGenRef   = useRef(0);

  const [phase,         setPhase]        = useState<FlowGamePhase>('idle');
  const [countdown,     setCountdown]    = useState<number | null>(null);
  const [stageIdx,      setStageIdx]     = useState(0);
  const [timerSec,      setTimerSec]     = useState(stages[0]?.durationSec ?? 25);
  const [stats,         setStats]        = useState<FlowStats | null>(null);
  const [totalProgress, setTotalProgress] = useState(0);
  const [initError,     setInitError]    = useState<string | null>(null);
  /** retry 트리거 — 증가할 때마다 엔진 useEffect가 재실행되어 새 엔진을 생성한다 */
  const [initKey,       setInitKey]      = useState(0);
  const [gateColorId,   setGateColorId]  = useState<GateColorId | null>(null);
  const [gatePose,      setGatePose]     = useState<ColorGatePoseKey | null>(null);
  const [gatePassCount, setGatePassCount] = useState(0);
  const mountedRef   = useRef(true);
  /** 현재 엔진 init 시점의 bgmPath 캡처 — 이후 변경 시 loadBgmLate만 호출 (더블스타트 방지) */
  const engineBgmRef = useRef<string | undefined>(undefined);

  // ── 엔진 초기화 ────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // bgmPath가 엔진 생성 이후에 변경될 때만 loadBgmLate 호출 (엔진 재생성 없이)
  useEffect(() => {
    if (!bgmPath || !engineRef.current) return;
    if (bgmPath === engineBgmRef.current) return;
    engineBgmRef.current = bgmPath;
    void engineRef.current.loadBgmLate(bgmPath);
  }, [bgmPath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stages.length === 0) return;
    if (stages.some((s) => s.isColorGate)) {
      void preloadColorGatePoseImages();
    }
    const initGen = ++initGenRef.current;
    setInitError(null);
    engineBgmRef.current = bgmPath;

    const classifyError = (msg: string): string => {
      const m = msg.toLowerCase();
      if (m.includes('context lost') || m.includes('webglcontextlost')) return 'WebGL 컨텍스트가 손실되었습니다. 다시 시도해 주세요.';
      if (m.includes('webgl') || m.includes('context')) return 'WebGL을 지원하지 않는 환경입니다. 다른 브라우저에서 시도하세요.';
      if (m.includes('image') || m.includes('texture')) return 'Flow 이미지를 불러오지 못했습니다.';
      if (m.includes('audio') || m.includes('bgm')) return 'Flow 오디오를 불러오지 못했습니다.';
      if (m.includes('module') || m.includes('import') || m.includes('chunk')) return 'Flow 모듈 로딩 실패. 네트워크를 확인해 주세요.';
      return `Flow 초기화 실패: ${msg}`;
    };

    let engine: FlowEngine;
    try {
      engine = new FlowEngine(
        canvas,
        {
          onPhaseChange:  (p) => { if (mountedRef.current) setPhase(p); },
          onCountdown:    (n) => { if (mountedRef.current) setCountdown(n); },
          onStageChange:  (idx) => {
            if (!mountedRef.current) return;
            setStageIdx(idx);
            setTimerSec(stages[idx]?.durationSec ?? 25);
            const st = stages[idx];
            if (!st?.isColorGate) {
              setGateColorId(null);
              setGatePose(null);
            }
          },
          onColorGateStage: () => {
            if (!mountedRef.current) return;
            setGateColorId(null);
            setGatePose(null);
            setGatePassCount(0);
          },
          onColorGateColor: (gateColorId, pose) => {
            if (!mountedRef.current) return;
            setGateColorId(gateColorId);
            setGatePose(pose ?? null);
          },
          onColorGatePassCount: (count) => {
            if (!mountedRef.current) return;
            setGatePassCount(count);
          },
          onTimerUpdate:  (rem, prog) => {
            if (!mountedRef.current) return;
            setTimerSec(rem);
            setTotalProgress(prog);
          },
          onInstruction:  () => { /* instruction 표시 제거 */ },
          onComplete:     (s) => { setStats(s); onComplete(s); },
          onCameraShake:  () => {},
          onFlash:        () => {},
        },
        { stages, motionScale, bgmPath, panoramaHighUrl, panoramaLowUrl, panoramaYawDeg },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (mountedRef.current) setInitError(`Flow 엔진 생성 실패: ${msg}`);
      return;
    }

    engineRef.current = engine;

    // webglcontextlost: 브라우저가 GPU 컨텍스트를 회수할 때 (탭 전환, 리소스 부족 등)
    const handleContextLost = (e: Event) => {
      e.preventDefault(); // 컨텍스트 복구 시도를 허용 (필수)
      if (!mountedRef.current) return;
      setInitError('WebGL 컨텍스트가 손실되었습니다. 다시 시도해 주세요.');
      engine.dispose();
      engineRef.current = null;
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    engine.init(flashRef.current).then(() => {
      if (!mountedRef.current || initGen !== initGenRef.current) { engine.dispose(); return; }
      onEngineReady?.({ loadBgmLate: (p) => engine.loadBgmLate(p) });
      // async init 완료 후 실제 뷰포트 크기로 재조정 (iOS Safari 초기화 타이밍 보정)
      engine.resize(window.innerWidth, window.innerHeight);
      engine.start();
    }).catch((err: unknown) => {
      if (!mountedRef.current || initGen !== initGenRef.current) { engine.dispose(); return; }
      const msg = err instanceof Error ? err.message : String(err);
      setInitError(classifyError(msg));
      engine.dispose();
      engineRef.current = null;
    });

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      engine.dispose();
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages.length, motionScale, panoramaHighUrl, panoramaLowUrl, panoramaYawDeg, initKey]); // bgmPath는 late-load로 처리하고, 파노라마 URL은 Asset Hub 로드 후 재초기화한다.

  // ── 리사이즈 ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onResize = () => engineRef.current?.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onResize);
    // iOS Safari: 주소창 표시/숨김 시 visualViewport resize 이벤트로 캔버스 크기 갱신
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  const handleExit = useCallback(() => {
    engineRef.current?.stop();
    onExit();
  }, [onExit]);

  // ── 현재 스테이지 ───────────────────────────────────────────────────────────

  const currentStage = stages[stageIdx];

  const colorGateHud = currentStage?.isColorGate
    && gateColorId
    && gatePose
    && (phase === 'playing' || phase === 'stage-intro')
    ? (
      <ColorGateHud
        gateColorId={gateColorId}
        cueWord={buildColorGateCue(gateColorId)}
        shortInstruction={buildColorGateInstruction(gateColorId, gatePose)}
        poseLabel={COLOR_GATE_POSE_LABELS[gatePose]}
        remainingSec={phase === 'playing' ? timerSec : undefined}
        passCount={gatePassCount}
      />
    )
    : null;

  // ── 오류 UI ─────────────────────────────────────────────────────────────────

  if (initError) {
    return (
      <div style={{ ...S.root, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
        <div style={{ color: '#EF4444', fontSize: '1rem', fontWeight: 700, textAlign: 'center', maxWidth: 360 }}>
          {initError}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => { setInitError(null); setInitKey(k => k + 1); }}
            style={{ padding: '0.65rem 1.4rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={onExit}
            style={{ padding: '0.65rem 1.4rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            목록으로
          </button>
        </div>
      </div>
    );
  }

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
      {phase === 'playing' && currentStage && !currentStage.isColorGate && (
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

        </>
      )}

      {colorGateHud}

      {/* ─── 스테이지 인트로 — 색 관문은 ColorGateHud, 그 외 중앙 팝업 ─ */}
      {phase === 'stage-intro' && currentStage && !currentStage.isColorGate && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
          animation: 'stageIntroBg 0.3s ease-out',
          pointerEvents: 'none',
          padding: 'clamp(0.75rem, 3vw, 1.5rem)',
        }}>
          <div style={{
            background: currentStage.isBonus ? 'rgba(40,25,0,0.95)' : 'rgba(5,8,20,0.95)',
            border: `2px solid ${currentStage.color}44`,
            borderRadius: '1.5rem',
            padding: 'clamp(1.25rem, 3.5vw, 2rem) clamp(1.25rem, 4vw, 2.5rem)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            width: 'min(92vw, 28rem)',
            maxWidth: '100%',
            boxSizing: 'border-box',
            boxShadow: `0 0 60px ${currentStage.color}33`,
            animation: 'stageIntroCard 0.35s cubic-bezier(0.22,1.4,0.36,1)',
          }}>
            <p style={{
              fontSize: '0.58rem', color: currentStage.color, fontWeight: 800,
              letterSpacing: '0.28em', marginBottom: '0.6rem', textAlign: 'center',
              wordBreak: 'keep-all',
            }}>
              {currentStage.isBonus ? '🏆 BONUS' : currentStage.label}
            </p>
            <h2 style={{
              fontSize: 'clamp(2.2rem, 7vw, 3.6rem)', fontWeight: 900, color: '#fff',
              fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif",
              letterSpacing: '0.04em', marginBottom: '0.6rem', textAlign: 'center',
              textShadow: `0 0 30px ${currentStage.color}, 3px 3px 0 #000`,
              wordBreak: 'keep-all', whiteSpace: 'nowrap',
            }}>
              {currentStage.cueWord}
            </h2>
            <p style={{
              fontSize: 'clamp(0.85rem, 2.4vw, 1rem)',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.55,
              textAlign: 'center',
              marginBottom: '1rem',
              width: '100%',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-line',
            }}>
              {currentStage.shortInstruction}
            </p>
            <div style={{
              display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
              justifyContent: 'center', width: '100%',
            }}>
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
        </div>
      )}

      {/* ─── 속도 전환 안내 (스테이지 후반 시작) ──────────────────────── */}
      {phase === 'speed-intro' && currentStage && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
          animation: 'stageIntroBg 0.3s ease-out',
          pointerEvents: 'none',
          padding: 'clamp(0.75rem, 3vw, 1.5rem)',
        }}>
          <div style={{
            background: 'rgba(5,15,25,0.95)',
            border: '2px solid #22d3ee44',
            borderRadius: '1.5rem',
            padding: 'clamp(1.25rem, 3.5vw, 1.8rem) clamp(1.25rem, 4vw, 2.5rem)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            width: 'min(92vw, 26rem)',
            maxWidth: '100%',
            boxSizing: 'border-box',
            boxShadow: '0 0 60px #22d3ee33',
            animation: 'stageIntroCard 0.35s cubic-bezier(0.22,1.4,0.36,1)',
          }}>
            <p style={{
              fontSize: '0.58rem', color: '#22d3ee', fontWeight: 800,
              letterSpacing: '0.28em', marginBottom: '0.6rem', textAlign: 'center',
              wordBreak: 'keep-all',
            }}>
              ⚡ SPEED UP
            </p>
            <h2 style={{
              fontSize: 'clamp(1.9rem, 7vw, 3.2rem)', fontWeight: 900, color: '#fff',
              fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif",
              letterSpacing: '0.04em', marginBottom: '0.4rem', textAlign: 'center',
              textShadow: '0 0 30px #22d3ee, 3px 3px 0 #000',
              wordBreak: 'keep-all', whiteSpace: 'nowrap',
            }}>
              빨라진다!
            </h2>
            <p style={{
              fontSize: 'clamp(0.8rem, 2.2vw, 0.95rem)',
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              lineHeight: 1.55,
              width: '100%',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-line',
            }}>
              속도가 올라갑니다{'\n'}리듬 잃지 마세요!
            </p>
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
        <div style={{ ...S.overlay, background: 'rgba(0,4,18,0.92)' }}>
          {/* 별 반짝 애니 */}
          <p style={{
            fontSize: '0.6rem', color: '#fbbf24', fontWeight: 800,
            letterSpacing: '0.5em', marginBottom: '0.6rem',
            animation: 'flowInstPop 0.4s ease-out',
          }}>
            🏆 &nbsp;활동 완료
          </p>
          <h2 style={{
            fontSize: 'clamp(3rem, 10vw, 5.5rem)', fontWeight: 900, color: '#fff',
            fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif",
            letterSpacing: '0.05em', marginBottom: '0.3rem',
            textShadow: '0 0 60px #fbbf24, 0 0 25px #f59e0b88, 3px 3px 0 #000',
            animation: 'flowInstPop 0.35s cubic-bezier(0.22,1.8,0.36,1)',
          }}>
            DIVE DONE!
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.6rem' }}>
            {stats.stagesCompleted} / {stages.length} 스테이지 진행 완료&nbsp;·&nbsp;{Math.round(stats.totalSec)}초
          </p>

          {/* 스테이지별 경험 배지 */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 340, marginBottom: '2.2rem' }}>
            {stages.map((s, si) => {
              const mod      = s.isColorGate ? FLOW_MODULES.colorGate : FLOW_MODULES[s.newModule];
              const done     = si < stats.stagesCompleted;
              return (
                <span key={s.stageIndex} style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  padding: '0.2rem 0.7rem', borderRadius: '9999px',
                  border: `1px solid ${done ? mod.colorBorder : 'rgba(255,255,255,0.15)'}`,
                  color:      done ? mod.color      : 'rgba(255,255,255,0.25)',
                  background: done ? mod.colorBg    : 'transparent',
                  opacity:    done ? 1 : 0.4,
                }}>
                  {done ? mod.icon : '○'} {mod.tag}
                </span>
              );
            })}
          </div>

          <button
            onClick={onExit}
            style={{
              padding: '0.75rem 2.8rem', borderRadius: '1.2rem',
              border: '2px solid #fbbf24',
              background: 'rgba(251,191,36,0.14)',
              color: '#fbbf24', fontWeight: 900, cursor: 'pointer',
              fontSize: '1.05rem', fontFamily: 'inherit',
              letterSpacing: '0.05em',
              boxShadow: '0 0 24px rgba(251,191,36,0.25)',
            }}
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
        @keyframes cuePop {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes flowInstPop {
          0%   { transform: translate(-50%, -50%) scale(0.55); opacity: 0; }
          70%  { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
        }
        @keyframes stageIntroBg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes stageIntroCard {
          from { transform: scale(0.8) translateY(20px); opacity: 0; }
          to   { transform: scale(1)   translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
