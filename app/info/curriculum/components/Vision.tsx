'use client';

export default function Vision() {
  return (
    <section id="vision" style={{ padding: '100px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
        <div className="reveal">
          <div className="label" style={{ color: 'var(--green)', marginBottom: 20 }}>
            문제 인식
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#fff', marginBottom: 24 }}>
            원장님,
            <br />
            아직도 이런
            <br />
            고민을 하시나요?
          </h2>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: 36, fontSize: '0.95rem' }}>
            현장의 목소리를 듣고, 스포키듀가 완벽한 해답을 찾았습니다.
          </p>
          <div
            style={{
              marginTop: 40,
              padding: 28,
              borderRadius: 16,
              background: 'rgba(61,220,132,0.05)',
              border: '1px solid rgba(61,220,132,0.2)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600, marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              스포키듀 도입으로 해결됩니다
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="benefit-tag" style={{ display: 'inline-flex', width: 'fit-content', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M2 7l4 4 6-7" stroke="#3ddc84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                연세대 연구진의 학문적 근거 제공
              </div>
              <div className="benefit-tag" style={{ display: 'inline-flex', width: 'fit-content', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M2 7l4 4 6-7" stroke="#3ddc84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                누가 가르쳐도 균일한 고퀄리티 매뉴얼
              </div>
              <div className="benefit-tag" style={{ display: 'inline-flex', width: 'fit-content', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M2 7l4 4 6-7" stroke="#3ddc84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                100% 자발적 참여를 이끄는 몰입형 시스템
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pain-card reveal d1">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.4" />
                  <path d="M8 4.5v4M8 11h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>강사마다 제각각인 수업</div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              메인 강사가 빠지면 수업 퀄리티가 떨어지고, 체계적인 커리큘럼이 없어 늘 불안합니다.
            </p>
          </div>
          <div className="pain-card reveal d2">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.4" />
                  <path d="M8 4.5v4M8 11h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>설득력 없는 학부모 상담</div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              우리 기관만의 특별한 무기가 없어 학부모님들께 확신을 심어주기 어렵습니다.
            </p>
          </div>
          <div className="pain-card reveal d3">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.4" />
                  <path d="M8 4.5v4M8 11h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>소외되는 아이들</div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              느린 학습자나 운동 신경이 부족한 아이들이 흥미를 잃고 겉도는 경우가 발생합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
