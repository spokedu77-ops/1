'use client';

import { COLOR_GATE_TARGET_COUNT, GATE_COLORS, type GateColorId } from '../engine/modules/colorGateGuides';

interface ColorGateHudProps {
  gateColorId: GateColorId;
  cueWord: string;
  poseLabel: string;
  passCount?: number;
  targetCount?: number;
}

const HUD_SANS = 'var(--spm-font-body)';

/** 브릿지 위 3D 문과 함께 쓰는 상단 안내 HUD (화면 전체 배경 없음) */
export default function ColorGateHud({
  gateColorId,
  cueWord,
  poseLabel,
  passCount,
  targetCount = COLOR_GATE_TARGET_COUNT,
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
        padding: 'clamp(18px, 3vh, 34px) clamp(16px, 4vw, 40px) 28px',
        pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 70%, transparent 100%)',
        boxSizing: 'border-box',
      }}
    >
      <p style={{
        fontSize: 'clamp(0.72rem, 1.5vw, 1rem)',
        fontWeight: 800,
        letterSpacing: '0.28em',
        color: 'rgba(255,255,255,0.75)',
        marginBottom: 10,
        textAlign: 'center',
        wordBreak: 'keep-all',
      }}>
        COLOR GATE
      </p>

      <p style={{
        fontSize: 'clamp(2.75rem, 9vw, 6.5rem)',
        fontWeight: 800,
        fontFamily: HUD_SANS,
        fontStyle: 'normal',
        fontStretch: 'normal',
        letterSpacing: 0,
        lineHeight: 1.05,
        color: color.bg,
        textShadow: '0 2px 12px rgba(0,0,0,0.8)',
        marginBottom: 10,
        textAlign: 'center',
        wordBreak: 'keep-all',
        whiteSpace: 'nowrap',
        transform: 'none',
      }}>
        {cueWord}
      </p>

      <p style={{
        fontSize: 'clamp(1.5rem, 4.5vw, 3rem)',
        fontWeight: 800,
        fontFamily: HUD_SANS,
        fontStyle: 'normal',
        letterSpacing: 0,
        color: '#fff',
        textShadow: '0 2px 10px rgba(0,0,0,0.75)',
        marginBottom: 10,
        textAlign: 'center',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        maxWidth: 'min(94vw, 56rem)',
        transform: 'none',
      }}>
        {`「${poseLabel}」`}
      </p>

      {passCount !== undefined ? (
        <span style={{
          fontSize: 'clamp(0.85rem, 1.8vw, 1.1rem)',
          fontWeight: 800,
          padding: '0.2rem 0.75rem',
          borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(0,0,0,0.45)',
          color: 'rgba(255,255,255,0.75)',
        }}>
          {Math.min(passCount, targetCount)} / {targetCount}회
        </span>
      ) : null}

    </div>
  );
}
