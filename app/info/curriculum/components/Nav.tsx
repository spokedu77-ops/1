'use client';

type NavProps = { scrolled: boolean };

function scrollToId(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: 'smooth' });
}

export default function Nav({ scrolled }: NavProps) {
  return (
    <nav
      id="curriculum-navbar"
      className={`curriculum-nav ${scrolled ? 'scrolled' : ''}`}
      aria-label="메인 네비게이션"
    >
      <div className="curriculum-nav-inner">
        <a href="#" className="curriculum-brand" onClick={(e) => { e.preventDefault(); scrollToId('hero'); }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <circle cx="14" cy="14" r="13" stroke="#3ddc84" strokeWidth="1.5" />
            <path
              d="M8 14c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6"
              stroke="#3ddc84"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="14" cy="14" r="2.5" fill="#3ddc84" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#fff' }}>
            SPOKEDU
          </span>
        </a>

        <div className="curriculum-nav-links">
          <a href="#vision" onClick={(e) => { e.preventDefault(); scrollToId('vision'); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', transition: 'color 0.2s' } as React.CSSProperties}>
            비전
          </a>
          <a href="#core-values" onClick={(e) => { e.preventDefault(); scrollToId('core-values'); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', transition: 'color 0.2s' } as React.CSSProperties}>
            핵심 가치
          </a>
          <a href="#program" onClick={(e) => { e.preventDefault(); scrollToId('program'); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', transition: 'color 0.2s' } as React.CSSProperties}>
            프로그램
          </a>
          <a href="#product" onClick={(e) => { e.preventDefault(); scrollToId('product'); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', transition: 'color 0.2s' } as React.CSSProperties}>
            솔루션
          </a>
        </div>

        <a
          href="#contact"
          className="btn-primary"
          style={{ padding: '10px 24px', fontSize: '0.82rem' }}
          onClick={(e) => { e.preventDefault(); scrollToId('contact'); }}
        >
          도입 문의
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </nav>
  );
}
