'use client';

export default function CoreValues() {
  return (
    <section id="core-values" style={{ padding: '100px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="reveal" style={{ marginBottom: 64 }}>
        <div className="label" style={{ color: 'var(--green)', marginBottom: 16 }}>
          Core Philosophy
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#fff', maxWidth: 500 }}>
            신체 활동을 통한
            <br />
            전인적 성장
          </h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: 340, fontSize: '0.9rem', lineHeight: 1.75 }}>
            운동은 괴로운 훈련이 아닙니다. 스스로 생각하고 즐기며 성장하는 스포키듀만의 3단계 핵심 가치를 경험하세요.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <div className="card value-card reveal d1" style={{ padding: '40px 32px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(61,220,132,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <rect x="2" y="4" width="18" height="14" rx="3" stroke="#3ddc84" strokeWidth="1.5" />
              <path d="M9 8l5 3-5 3V8z" fill="#3ddc84" />
            </svg>
          </div>
          <div className="label" style={{ color: 'var(--green)', marginBottom: 10 }}>
            Play
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>즐거운 몰입</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.8 }}>
            아이들이 스스로 움직이고 싶게 만드는 자발적 몰입을 최우선으로 합니다. 억지로 하는 운동이 아닌, 놀이처럼 빠져드는 몰입형 웜업 시스템을 제공합니다.
          </p>
        </div>

        <div className="card value-card reveal d2" style={{ padding: '40px 32px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(99,179,237,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <path d="M11 3a8 8 0 1 1-3.5 15.2L4 19l.8-3.5A8 8 0 0 1 11 3z" stroke="#63b3ed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 10h6M8 13h4" stroke="#63b3ed" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="label" style={{ color: '#63b3ed', marginBottom: 10 }}>
            Think
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>인지적 자극</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.8 }}>
            신체 활동은 뇌를 깨우는 과정입니다. 단순 반복이 아닌, 어떻게 움직일지 스스로 생각하고 판단하며 문제를 해결하는 인지 중심 체육을 지향합니다.
          </p>
        </div>

        <div className="card value-card reveal d3" style={{ padding: '40px 32px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(167,139,250,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <path d="M11 19V8M11 8C11 8 8 5 5 6M11 8c0 0 3-3 6-2" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 19h14" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="label" style={{ color: '#a78bfa', marginBottom: 10 }}>
            Grow
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>전인적 발달</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.8 }}>
            신체의 발달은 곧 마음과 생각의 성장으로 이어집니다. 어제보다 더 나은 나를 만나며 자신감을 얻는 지속 가능한 성장을 지원합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
