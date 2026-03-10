'use client';

import { GYM_CONFIG } from '../data/config';

const FOOT_LINKS = [
  { href: '#intro', label: '소개' },
  { href: '#curriculum', label: '커리큘럼' },
  { href: '#pricing', label: '수강료' },
  { href: '#contact', label: '상담' },
  { href: GYM_CONFIG.center.privacyUrl, label: '개인정보처리방침' },
] as const;

export default function Footer() {
  const year = typeof window !== 'undefined' ? new Date().getFullYear() : new Date().getFullYear();

  return (
    <footer className="gym-footer" role="contentinfo">
      <div className="gym-container">
        <div className="gym-foot-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div className="gym-brand-logo" style={{ width: 28, height: 28 }} aria-hidden />
              <strong style={{ color: 'rgba(234,240,255,.92)' }}>{GYM_CONFIG.center.name}</strong>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gym-muted)', lineHeight: 1.6 }}>
              스포키듀는 아동·청소년 체육 교육 기관이며 의료/치료 서비스를 제공하지 않습니다.
              <br />
              © {year} SPOKEDU. All rights reserved.
            </p>
          </div>
          <nav className="gym-foot-links" aria-label="푸터 메뉴">
            {FOOT_LINKS.map(({ href, label }) => (
              <a key={label} href={href.startsWith('#') ? href : undefined} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
