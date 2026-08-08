'use client';

import React from 'react';

/** 시지각·관련 캔버스 플레이어 공통 시작 워밍업(초). VisualReactionTraining과 동일. */
export const REACT_TRAIN_START_COUNTDOWN_SEC = 3;

const OVERLAY_CSS = `
@keyframes reactTrainCdPop {
  0% { transform: scale(0.3); opacity: 0; }
  65% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); }
}
.react-train-cd-pop {
  animation: reactTrainCdPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
`;

/**
 * 시작 3·2·1 오버레이 (MemoryGameApp CSS 없이도 동작).
 * countdown ≤ 0 이면 렌더하지 않는다.
 */
export function ReactTrainStartCountdownOverlay({ countdown }: { countdown: number }) {
  if (countdown <= 0) return null;
  return (
    <>
      <style>{OVERLAY_CSS}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.62)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      >
        <div
          key={countdown}
          className="react-train-cd-pop"
          style={{
            fontFamily: 'Bebas Neue,Barlow Condensed,sans-serif',
            fontSize: 'clamp(120px,30vw,260px)',
            fontWeight: 900,
            color: '#F97316',
            lineHeight: 1,
            textShadow: '0 0 48px rgba(249,115,22,0.42)',
          }}
        >
          {countdown}
        </div>
      </div>
    </>
  );
}

/**
 * VRT와 동일 타이밍: 즉시 N 표시 → 60ms 후 1초마다 N-1… → 0에서 onDone.
 * 반환값은 cleanup.
 */
export function runReactTrainStartCountdown(opts: {
  seconds?: number;
  onTick: (n: number) => void;
  onDone: () => void;
}): () => void {
  const seconds = Math.max(1, Math.round(opts.seconds ?? REACT_TRAIN_START_COUNTDOWN_SEC));
  opts.onTick(seconds);
  let value = seconds;
  let interval: ReturnType<typeof setInterval> | null = null;
  const startId = window.setTimeout(() => {
    interval = setInterval(() => {
      value -= 1;
      if (value <= 0) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        opts.onTick(0);
        opts.onDone();
        return;
      }
      opts.onTick(value);
    }, 1000);
  }, 60);

  return () => {
    clearTimeout(startId);
    if (interval) clearInterval(interval);
  };
}
