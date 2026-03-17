'use client';

export default function Program() {
  return (
    <section id="program" style={{ padding: '100px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
        <div className="reveal">
          <div className="label" style={{ color: 'var(--green)', marginBottom: 20 }}>
            모두를 위한 교과서
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', color: '#fff', marginBottom: 24 }}>
            완벽한
            <br />
            신체활동
            <br />
            교과서
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 44 }}>
            스포키듀의 프로그램은 대상을 가리지 않습니다. 학문적 근거를 바탕으로 설계된 자체 연간 커리큘럼은 현장에서 즉시 적용 가능합니다.
          </p>
          <div>
            <div className="feature-item">
              <div className="feature-num">01</div>
              <div>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6, fontSize: '0.95rem' }}>유아 및 성인, 시니어 통합형</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>연령별 신체 발달 특성에 맞춘 세밀한 난이도 조절 시스템</div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-num">02</div>
              <div>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6, fontSize: '0.95rem' }}>느린 학습자를 위한 포용성</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>특수 체육이 필요한 아이들도 소외되지 않고 참여할 수 있는 따뜻한 프로그램 설계</div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-num">03</div>
              <div>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6, fontSize: '0.95rem' }}>현장 검증 완료 커리큘럼</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>3만 팔로워와의 소통을 통해 다듬어진 실전 최적화 웜업 솔루션</div>
              </div>
            </div>
          </div>
        </div>

        <div className="reveal d2">
          <div
            style={{
              borderRadius: 20,
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
              padding: 40,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="blob" style={{ width: 300, height: 300, background: 'rgba(61,220,132,0.06)', top: -50, right: -50 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Annual Curriculum 2026
                </div>
                <div className="pill" style={{ fontSize: '0.7rem' }}>In Progress</div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Play Module</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--green)' }}>완료</div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #3ddc84, #2bb069)', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Think Module</div>
                  <div style={{ fontSize: '0.75rem', color: '#63b3ed' }}>진행 중</div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '75%', background: 'linear-gradient(90deg, #63b3ed, #4299e1)', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Grow Module</div>
                  <div style={{ fontSize: '0.75rem', color: '#a78bfa' }}>개발 중</div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '42%', background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ paddingTop: 28, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', fontFamily: "'DM Serif Display',serif", marginBottom: 6 }}>
                  Immersive Interactive System
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>기관의 역량을 극대화하는 체계적인 매뉴얼</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
