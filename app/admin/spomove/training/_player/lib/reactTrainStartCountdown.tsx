'use client';

import { useEffect, useState, type ReactNode } from 'react';

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
 * VRT와 동일 타이밍: 즉시 N 표시 → 매 1초마다 N-1… → 0에서 onDone.
 * 예: 3초면 3·2·1 각 1초(총 정확히 3초) 후 onDone.
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
  const interval = setInterval(() => {
    value -= 1;
    if (value <= 0) {
      clearInterval(interval);
      opts.onTick(0);
      opts.onDone();
      return;
    }
    opts.onTick(value);
  }, 1000);

  return () => {
    clearInterval(interval);
  };
}

/** MASTER 등에서 플레이어 마운트 전 공통 3·2·1 게이트 */
export function StartCountdownGate({
  children,
  seconds = REACT_TRAIN_START_COUNTDOWN_SEC,
}: {
  children: ReactNode;
  seconds?: number;
}) {
  const [countdown, setCountdown] = useState(Math.max(1, Math.round(seconds)));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    return runReactTrainStartCountdown({
      seconds,
      onTick: setCountdown,
      onDone: () => setReady(true),
    });
  }, [ready, seconds]);

  if (!ready) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 320,
          height: '100dvh',
          maxHeight: '100dvh',
          background: '#0a0a0f',
        }}
      >
        <ReactTrainStartCountdownOverlay countdown={countdown} />
      </div>
    );
  }
  return <>{children}</>;
}
