'use client';
import React from 'react';

export type BodyActionId = 'twoFeet' | 'oneFoot' | 'oneHand' | 'twoHands';

export const BODY_ACTION_LABELS: Record<BodyActionId, string> = {
  twoFeet: '두 발', oneFoot: '한 발', oneHand: '한 손', twoHands: '두 손',
};

const F = 'rgba(255,255,255,0.95)';
const BASE: React.CSSProperties = { width: '100%', height: '100%', display: 'block', overflow: 'visible' };

/** 발자국 픽토그램 — 위에서 내려다본 형태, 발가락이 위, 발꿈치가 아래 */
function FootPrint({ t }: { t: string }) {
  return (
    <g transform={t} fill={F}>
      {/* 발바닥 */}
      <ellipse cx="0" cy="12" rx="13" ry="26" />
      {/* 발꿈치 */}
      <ellipse cx="0" cy="36" rx="10" ry="8" />
      {/* 발가락 5개 */}
      <circle cx="-14" cy="-20" r="4.5" />
      <circle cx="-6"  cy="-28" r="5"   />
      <circle cx="3"   cy="-31" r="5.5" />
      <circle cx="12"  cy="-28" r="5"   />
      <circle cx="18"  cy="-19" r="4"   />
    </g>
  );
}

/** 손바닥 픽토그램 — 정면, 손가락 위, 엄지 왼쪽 */
function HandPalm({ t }: { t: string }) {
  return (
    <g transform={t} fill={F}>
      {/* 손바닥 */}
      <rect x="-18" y="-6" width="36" height="32" rx="9" />
      {/* 검지 */}
      <rect x="-16" y="-52" width="8" height="52" rx="4" />
      {/* 중지 */}
      <rect x="-5"  y="-58" width="8" height="58" rx="4" />
      {/* 약지 */}
      <rect x="6"   y="-54" width="8" height="54" rx="4" />
      {/* 새끼 */}
      <rect x="17"  y="-46" width="7" height="40" rx="3.5" />
      {/* 엄지 (기울어진 타원) */}
      <ellipse cx="-26" cy="-12" rx="7" ry="15" transform="rotate(-22 -26 -12)" />
    </g>
  );
}

export function OneFootIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="-24 -44 48 88" style={{ ...BASE, ...style }} aria-hidden>
      <FootPrint t="" />
    </svg>
  );
}

export function TwoFeetIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="-54 -40 108 80" style={{ ...BASE, ...style }} aria-hidden>
      <FootPrint t="translate(-26 0) scale(-0.82 0.82)" />
      <FootPrint t="translate(26 0) scale(0.82 0.82)" />
    </svg>
  );
}

export function OneHandIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="-36 -62 72 98" style={{ ...BASE, ...style }} aria-hidden>
      <HandPalm t="" />
    </svg>
  );
}

export function TwoHandsIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="-78 -58 156 94" style={{ ...BASE, ...style }} aria-hidden>
      <HandPalm t="translate(-36 0) scale(-0.8 0.8)" />
      <HandPalm t="translate(36 0) scale(0.8 0.8)" />
    </svg>
  );
}

export function BodyActionIcon({ actionId, style }: { actionId: BodyActionId; style?: React.CSSProperties }) {
  switch (actionId) {
    case 'oneFoot':  return <OneFootIcon style={style} />;
    case 'twoFeet':  return <TwoFeetIcon style={style} />;
    case 'oneHand':  return <OneHandIcon style={style} />;
    case 'twoHands': return <TwoHandsIcon style={style} />;
  }
}
