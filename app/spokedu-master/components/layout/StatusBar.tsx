'use client';

import { useEffect, useState } from 'react';

export function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b px-[22px]"
      style={{
        height: 48,
        background: 'rgba(7,7,12,0.92)',
        backdropFilter: 'blur(20px)',
        borderColor: 'var(--spm-br)',
      }}
    >
      <span
        className="text-[15px] font-semibold tracking-tight"
        style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}
      >
        {time}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--spm-t3)' }}>
        SPOKEDU
      </span>
      <div className="flex items-center gap-1.5" aria-hidden>
        <div
          className="relative flex items-center rounded-[2px] border p-[2px]"
          style={{ width: 22, height: 11, borderColor: 'rgba(255,255,255,0.3)' }}
        >
          <div className="h-full rounded-[1px]" style={{ width: '72%', background: 'var(--spm-grn)' }} />
          <div
            className="absolute rounded-[0_1px_1px_0]"
            style={{
              right: -3,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 2.5,
              height: 5,
              background: 'rgba(255,255,255,0.3)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
