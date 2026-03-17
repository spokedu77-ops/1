'use client';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Hero() {
  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 28px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="blob" style={{ width: 600, height: 600, background: 'rgba(61,220,132,0.07)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
      <div className="blob" style={{ width: 300, height: 300, background: 'rgba(61,220,132,0.05)', top: '20%', right: '10%' }} />
      <div className="blob" style={{ width: 200, height: 200, background: 'rgba(34,80,55,0.15)', bottom: '20%', left: '5%' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="pill hero-anim-1" style={{ marginBottom: 28 }}>
          <span className="pill-dot" aria-hidden />
          연세대 체육교육 전문가 × 3만 팔로워의 선택
        </div>
        <h1
          className="display hero-anim-2"
          style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', color: '#fff', marginBottom: 28 }}
        >
          몰입형 인터랙티브 웜업,
          <br />
          <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>대한민국 체육의 새 기준</em>
        </h1>
        <p
          className="hero-anim-3"
          style={{ fontSize: '1.15rem', color: 'var(--text-dim)', maxWidth: 560, margin: '0 auto 44px', lineHeight: 1.75 }}
        >
          아이부터 시니어, 느린 학습자까지. 모두가 자발적으로 몰입하는 프로그램으로 귀 기관의 교육 시스템을 진화시킵니다.
        </p>
        <div className="hero-anim-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 56 }}>
          <a href="#contact" className="btn-primary" onClick={(e) => { e.preventDefault(); scrollToId('contact'); }}>
            무료 도입 컨설팅 신청
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a href="#vision" className="btn-ghost" onClick={(e) => { e.preventDefault(); scrollToId('vision'); }}>
            커리큘럼 보기
          </a>
        </div>
        <p className="hero-anim-5" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          문의 후 24시간 이내 연세대 출신 전문가가 직접 연락드립니다
        </p>
      </div>
    </section>
  );
}
