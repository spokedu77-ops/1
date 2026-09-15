'use client';

import { useEffect, useState } from 'react';

type Props = { durationSec: number; onComplete: () => void; onExit: () => void };

export default function UnityDiveThemeClient({ durationSec, onComplete, onExit }: Props) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActive(false);
      onComplete();
    }, Math.max(1, durationSec) * 1000);
    return () => window.clearTimeout(timer);
  }, [durationSec, onComplete]);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      {active ? <iframe src="/spomove/dive/unity/theme2/index.html" title="SPORTS ARENA" allowFullScreen style={{ width: '100%', height: '100%', border: 0, background: '#000', display: 'block' }} /> : null}
      {active ? (
        <button type="button" onClick={() => { setActive(false); onExit(); }} style={{ position: 'absolute', top: 10, right: 14, zIndex: 40, minWidth: 82, padding: '0.5rem 0.75rem', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '0.7rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
          ✕ 나가기
        </button>
      ) : null}
    </div>
  );
}
