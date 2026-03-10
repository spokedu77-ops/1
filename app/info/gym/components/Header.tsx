'use client';

import { useCallback, useState } from 'react';
import { GYM_CONFIG } from '../data/config';

const NAV_LINKS = [
  { href: '#intro', label: '소개' },
  { href: '#target', label: '수업 대상' },
  { href: '#curriculum', label: '커리큘럼' },
  { href: '#instructors', label: '선생님 소개' },
  { href: '#media', label: '사진/영상' },
  { href: '#schedule', label: '시간표' },
  { href: '#pricing', label: '가격 안내' },
  { href: '#report', label: '성장 리포트' },
  { href: '#reviews', label: '수업 후기' },
  { href: '#faq', label: 'FAQ' },
  { href: '#location', label: '오시는 길' },
  { href: '#parking', label: '주차' },
  { href: '#contact', label: '예약 및 문의' },
] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: 'smooth' });
}

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openKakao = useCallback(() => {
    if (typeof window !== 'undefined' && GYM_CONFIG.kakao.webUrl) {
      window.open(GYM_CONFIG.kakao.webUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <header className="gym-header" role="banner">
        <div className="gym-container">
          <nav className="gym-nav" aria-label="메인 네비게이션">
            <a className="gym-brand" href="#top" aria-label={`${GYM_CONFIG.center.name} 홈으로`}>
              <div className="gym-brand-logo" aria-hidden />
              <span>{GYM_CONFIG.center.name}</span>
            </a>
            <div className="gym-nav-links">
              {NAV_LINKS.map(({ href, label }) => (
                <a key={href} href={href} onClick={(e) => { e.preventDefault(); scrollToId(href.slice(1)); }}>
                  {label}
                </a>
              ))}
            </div>
            <div className="gym-nav-cta">
              <button type="button" className="gym-btn" onClick={() => scrollToId('pricing')}>
                수강료 보기
              </button>
              <button type="button" className="gym-btn" onClick={openKakao}>
                카카오 상담
              </button>
              <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
                상담 신청
              </button>
              <button
                type="button"
                className="gym-btn gym-burger"
                aria-label="메뉴 열기"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                ☰
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div
        className={`gym-drawer ${drawerOpen ? 'open' : ''}`}
        aria-hidden={!drawerOpen}
        onClick={closeDrawer}
        role="dialog"
        aria-label="메뉴"
      >
        <div className="gym-drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>메뉴</strong>
            <button type="button" className="gym-btn" onClick={closeDrawer} aria-label="메뉴 닫기">
              닫기
            </button>
          </div>
          <nav aria-label="모바일 메뉴">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => {
                  closeDrawer();
                  scrollToId(href.slice(1));
                }}
              >
                {label}
              </a>
            ))}
          </nav>
          <button type="button" className="gym-btn primary" style={{ width: '100%' }} onClick={() => { closeDrawer(); scrollToId('contact'); }}>
            상담 신청
          </button>
        </div>
      </div>
    </>
  );
}
