'use client';

import { useEffect, useState } from 'react';

interface AxisRowProps {
  label: string;
  ll: string;
  rl: string;
  lv: number;
  rv: number;
  col: string;
  delay?: number;
}

/** 원본 HTML 성향 강도 행 (양쪽 막대 + 우세 표기) */
export default function AxisRow({ label, ll, rl, lv, rv, col, delay = 0 }: AxisRowProps) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setW(1), 300 + delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  const dom = lv >= rv;

  return (
    <div style={{ padding: '11px 0', borderBottom: '1px solid #222' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#999', letterSpacing: '.04em' }}>
          {label.toUpperCase()}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 800, color: col }}>{dom ? ll : rl} 우세</span>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '11px',
            color: dom ? col : '#555',
            fontWeight: 700,
            width: '24px',
            textAlign: 'right',
            transition: 'color .3s',
          }}
        >
          {lv}
        </span>
        <div style={{ flex: 1, height: '6px', background: '#222', borderRadius: '99px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: '99px',
              background: dom ? col : '#444',
              width: `${w * (lv / 3) * 100}%`,
              transition: 'width 1s cubic-bezier(.16,1,.3,1)',
            }}
          />
        </div>
        <span style={{ fontSize: '10px', color: '#A8A8A8', fontWeight: 600, letterSpacing: '.04em' }}>vs</span>
        <div style={{ flex: 1, height: '6px', background: '#222', borderRadius: '99px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: '99px',
              background: !dom ? col : '#444',
              width: `${w * (rv / 3) * 100}%`,
              transition: 'width 1s cubic-bezier(.16,1,.3,1)',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '11px',
            color: !dom ? col : '#555',
            fontWeight: 700,
            width: '24px',
            transition: 'color .3s',
          }}
        >
          {rv}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: '#A8A8A8' }}>{ll}</span>
        <span style={{ fontSize: '10px', color: '#A8A8A8' }}>{rl}</span>
      </div>
    </div>
  );
}
