'use client';

export default function Benefits() {
  return (
    <section id="partnership" style={{ padding: '100px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
        <div className="label" style={{ color: 'var(--green)', marginBottom: 16 }}>
          Benefits
        </div>
        <h2 className="display" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#fff', marginBottom: 16 }}>
          도입 기관에 제공되는
          <br />
          3가지 독보적 특권
        </h2>
        <p style={{ color: 'var(--text-dim)', maxWidth: 440, margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.75 }}>
          단순한 프로그램 납품이 아닙니다. 귀 기관이 지역 내 최고의 교육 센터로 자리 잡도록 돕습니다.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <div className="card reveal d1" style={{ padding: '36px 32px' }}>
          <div className="label" style={{ color: 'var(--green)', marginBottom: 16 }}>01. 시스템 구축</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>현장 검증 연간 매뉴얼</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.8 }}>
            3만 팔로워가 열광한 몰입형 웜업(Play-Think-Grow) 연간 커리큘럼을 제공하여 기관의 수업 퀄리티를 상향 평준화합니다.
          </p>
        </div>
        <div className="card reveal d2" style={{ padding: '36px 32px' }}>
          <div className="label" style={{ color: 'var(--green)', marginBottom: 16 }}>02. 강사진 리더십</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>강사 역량 강화 교육</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.8 }}>
            연세대 체육교육 전문가의 직강을 통해 기관 소속 강사들이 진정한 교육 전문가로 성장할 수 있는 비전을 제시합니다.
          </p>
        </div>
        <div className="card reveal d3" style={{ padding: '36px 32px' }}>
          <div className="label" style={{ color: 'var(--green)', marginBottom: 16 }}>03. 학부모 신뢰</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>프리미엄 상담 키트</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.8 }}>
            학문적 근거가 담긴 전문 상담 자료를 제공하여 학부모 상담 시 압도적인 신뢰감과 등록 명분을 부여합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
