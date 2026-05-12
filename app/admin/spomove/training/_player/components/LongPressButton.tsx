'use client';

import React, { useState, useRef } from 'react';

const HOLD_MS = 500;

export function LongPressButton({ onTrigger, label }: { onTrigger: () => void; label: string }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const triggeredRef = useRef(false);

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    triggeredRef.current = false;
    startRef.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(elapsed / HOLD_MS, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(0);
        if (!triggeredRef.current) {
          triggeredRef.current = true;
          onTrigger();
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setProgress(0);
    if (!triggeredRef.current) {
      triggeredRef.current = true;
      onTrigger();
    }
  };

  const cancelOnly = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setProgress(0);
  };

  return (
    <button
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancelOnly}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchCancel={cancelOnly}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#22C55E',
        color: '#fff',
        border: 'none',
        borderRadius: '1.25rem',
        padding: '1.1rem 2.8rem',
        fontSize: 'clamp(1.1rem,3vw,1.4rem)',
        fontWeight: 800,
        cursor: 'pointer',
        fontFamily: 'inherit',
        boxShadow: '0 8px 32px rgba(34,197,94,0.45)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.25)',
          transformOrigin: 'left',
          transform: `scaleX(${progress})`,
          transition: progress === 0 ? 'transform 0.15s' : 'none',
          borderRadius: '1.25rem',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
    </button>
  );
}
