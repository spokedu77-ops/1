'use client';

import { GATE_COLORS, type GateColorId } from '../engine/modules/colorGateGuides';

interface ColorGateHudProps {
  gateColorId: GateColorId;
  cueWord: string;
  shortInstruction: string;
  poseLabel: string;
  remainingSec?: number;
  passCount?: number;
}

/** 브릿지 위 3D 문과 함께 쓰는 상단 안내 HUD (화면 전체 배경 없음) */
export default function ColorGateHud({
  gateColorId,
  cueWord,
  shortInstruction,
  poseLabel,
  remainingSec,
  passCount,
}: ColorGateHudProps) {
  const color = GATE_COLORS[gateColorId];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px clamp(12px, 4vw, 24px) 20px',
        pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 70%, transparent 100%)',
        boxSizing: 'border-box',
      }}
    >
      <p style={{
        fontSize: '0.62rem',
        fontWeight: 800,
        letterSpacing: '0.28em',
        color: 'rgba(255,255,255,0.75)',
        marginBottom: 6,
        textAlign: 'center',
        wordBreak: 'keep-all',
      }}>
        COLOR GATE
      </p>

      <p style={{
        fontSize: 'clamp(1.5rem, 5.5vw, 2.6rem)',
        fontWeight: 900,
        fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif",
        letterSpacing: '0.06em',
        color: color.bg,
        WebkitTextStroke: '1px rgba(255,255,255,0.35)',
        textShadow: '0 2px 12px rgba(0,0,0,0.8)',
        marginBottom: 4,
        textAlign: 'center',
        wordBreak: 'keep-all',
        whiteSpace: 'nowrap',
      }}>
        {cueWord}
      </p>

      <p style={{
        fontSize: 'clamp(0.95rem, 3.2vw, 1.3rem)',
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '0.04em',
        marginBottom: 6,
        textAlign: 'center',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        maxWidth: 'min(92vw, 28rem)',
      }}>
        {poseLabel}
      </p>

      <p style={{
        fontSize: 'clamp(0.78rem, 2.2vw, 0.9rem)',
        fontWeight: 700,
        color: 'rgba(255,255,255,0.92)',
        textAlign: 'center',
        width: '100%',
        maxWidth: 'min(92vw, 28rem)',
        lineHeight: 1.5,
        marginBottom: 8,
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-line',
      }}>
        {shortInstruction}
      </p>

      {passCount !== undefined && passCount > 0 ? (
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          padding: '0.2rem 0.75rem',
          borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(0,0,0,0.45)',
          color: 'rgba(255,255,255,0.75)',
        }}>
          {passCount}회
        </span>
      ) : null}

      {remainingSec !== undefined ? (
        <span style={{
          position: 'absolute',
          bottom: 8,
          right: 16,
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          color: 'rgba(255,255,255,0.55)',
        }}>
          {Math.ceil(remainingSec)}s
        </span>
      ) : null}
    </div>
  );
}
