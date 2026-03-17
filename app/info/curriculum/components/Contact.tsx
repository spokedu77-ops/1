'use client';

export default function Contact() {
  return (
    <section id="contact" style={{ padding: '80px 28px 120px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 100,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: 24,
              letterSpacing: '0.05em',
            }}
          >
            현재 지역별 선착순 모집 중
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#fff', marginBottom: 16 }}>
            지금, 스포키듀로
            <br />
            교육의 격을 높이세요
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: 1.75 }}>
            도입 문의를 남겨주시면, 스포키듀 전문가가 귀 기관의 상황을 분석하고 최적의 솔루션을 무료로 제안해 드립니다.
          </p>
        </div>

        <div
          className="reveal"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 40,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="blob" style={{ width: 400, height: 400, background: 'rgba(61,220,132,0.04)', top: -100, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label className="form-label">기관명</label>
                <input type="text" className="form-field" placeholder="예: 스포키듀 센터" />
              </div>
              <div>
                <label className="form-label">담당자 성함 및 직책</label>
                <input type="text" className="form-field" placeholder="예: 홍길동 원장" />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">연락처</label>
              <input type="tel" className="form-field" placeholder="빠른 회신을 위해 휴대폰 번호를 남겨주세요" />
            </div>
            <div style={{ marginBottom: 32 }}>
              <label className="form-label">
                현재 가장 큰 고민은 무엇인가요? <span style={{ color: 'var(--text-muted)' }}>(선택)</span>
              </label>
              <textarea
                rows={3}
                className="form-field"
                style={{ resize: 'none' }}
                placeholder="수업 퀄리티 향상, 원생 모집, 강사 교육 등 자유롭게 적어주시면 맞춤형 상담을 준비하겠습니다."
              />
            </div>
            <button type="button" className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: 18 }}>
              기관 맞춤형 솔루션 무료로 받기
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M3.75 9h10.5M10.5 5.25L14.25 9l-3.75 3.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 16, lineHeight: 1.6 }}>
              남겨주신 정보는 상담 목적으로만 사용되며 외부로 유출되지 않습니다.
            </p>
          </div>
          <div
            style={{
              position: 'absolute',
              top: -1,
              right: 32,
              background: 'var(--green)',
              color: '#061209',
              fontWeight: 800,
              fontSize: '0.75rem',
              padding: '8px 16px',
              borderRadius: '0 0 12px 12px',
              letterSpacing: '0.02em',
            }}
          >
            상담 무료
          </div>
        </div>
      </div>
    </section>
  );
}
