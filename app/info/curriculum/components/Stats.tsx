'use client';

import { type RefObject } from 'react';

type StatsProps = { statsGridRef: RefObject<HTMLDivElement | null> };

export default function Stats({ statsGridRef }: StatsProps) {
  return (
    <section style={{ padding: '64px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <div
        ref={statsGridRef}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}
        id="curriculum-stats-grid"
      >
        <div className="reveal d1" style={{ textAlign: 'center', padding: '32px 16px', borderRight: '1px solid var(--border)' }}>
          <div className="stat-num">30,000+</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>교육 현장 팔로워</div>
        </div>
        <div className="reveal d2" style={{ textAlign: 'center', padding: '32px 16px', borderRight: '1px solid var(--border)' }}>
          <div className="stat-num">Yonsei</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>학문적 근거</div>
        </div>
        <div className="reveal d3" style={{ textAlign: 'center', padding: '32px 16px', borderRight: '1px solid var(--border)' }}>
          <div className="stat-num">100%</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>자발적 참여 유도율</div>
        </div>
        <div className="reveal d4" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div className="stat-num">All</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>유아부터 특수체육까지</div>
        </div>
      </div>
    </section>
  );
}
