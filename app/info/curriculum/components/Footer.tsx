'use client';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Footer() {
  return (
    <footer
      style={{
        padding: '40px 28px',
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden>
          <circle cx="14" cy="14" r="13" stroke="#3ddc84" strokeWidth="1.5" />
          <path d="M8 14c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="#3ddc84" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="14" cy="14" r="2.5" fill="#3ddc84" />
        </svg>
        <span style={{ fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', fontSize: '1rem' }}>SPOKEDU</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        © 2026 SPOKEDU. 신체 활동을 통해 스스로 생각하는 힘을 기릅니다.
      </p>
      <div style={{ display: 'flex', gap: 24 }}>
        <a href="#vision" onClick={(e) => { e.preventDefault(); scrollToId('vision'); }} style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          비전
        </a>
        <a href="#program" onClick={(e) => { e.preventDefault(); scrollToId('program'); }} style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          프로그램
        </a>
        <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToId('contact'); }} style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          도입 문의
        </a>
      </div>
    </footer>
  );
}
