'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GYM_CONFIG } from '../data/config';

const NAV_LINKS = [
  { href: '#lab-intro', label: 'LAB 소개' },
  { href: '#media', label: '사진/영상' },
  { href: '#target', label: '대상/연령' },
  { href: '#curriculum', label: '12주 커리큘럼' },
  { href: '#instructors', label: '강사진' },
  { href: '#weekly-ops', label: '주간 운영 구조' },
  { href: '#report', label: '성장 리포트' },
  { href: '#reviews', label: '후기' },
  { href: '#faq', label: 'FAQ' },
  { href: '#schedule', label: '시간표' },
  { href: '#pricing', label: '가격' },
  { href: '#location', label: '오시는 길' },
  { href: '#contact', label: '체험/상담' },
] as const;

/** 데스크톱용 3~4개 항으로 묶음 */
const NAV_GROUPS = [
  { key: 'about', label: 'LAB 안내', ids: ['lab-intro', 'media', 'target', 'curriculum', 'instructors'] as const },
  { key: 'ops', label: '운영 구조', ids: ['weekly-ops', 'report', 'reviews'] as const },
  { key: 'info', label: '안내 정보', ids: ['faq', 'schedule', 'pricing', 'location'] as const },
] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: 'smooth' });
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const goTo = useCallback((id: string) => {
    setOpenGroup(null);
    scrollToId(id);
  }, []);

  useEffect(() => {
    if (!openGroup) return;
    const onOutside = (e: MouseEvent) => {
      if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [openGroup]);

  const getLabel = (id: string) => NAV_LINKS.find((l) => l.href.slice(1) === id)?.label ?? id;

  return (
    <>
      <header className="gym-header" role="banner">
        <div className="gym-container">
          <nav className="gym-nav" aria-label="메인 네비게이션">
            <a className="gym-brand" href="#top" aria-label={`${GYM_CONFIG.center.name} 홈으로`}>
              <div className="gym-brand-logo" aria-hidden />
              <span>{GYM_CONFIG.center.name}</span>
            </a>

            <div className="gym-nav-menus" ref={navMenuRef}>
              {NAV_GROUPS.map((group) => (
                <div key={group.key} className="gym-nav-menu">
                  <button
                    type="button"
                    className="gym-btn gym-menu-trigger"
                    aria-expanded={openGroup === group.key}
                    aria-haspopup="true"
                    onClick={() => setOpenGroup((k) => (k === group.key ? null : group.key))}
                  >
                    {group.label}
                    <ChevronDown />
                  </button>
                  <div className={`gym-nav-dropdown ${openGroup === group.key ? 'open' : ''}`}>
                    {group.ids.map((id) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          goTo(id);
                        }}
                      >
                        {getLabel(id)}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="gym-nav-cta">
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
                <MenuIcon />
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
          <div className="gym-drawer-head">
            <strong>메뉴</strong>
            <button type="button" className="gym-btn gym-drawer-close" onClick={closeDrawer} aria-label="메뉴 닫기">
              <CloseIcon />
            </button>
          </div>
          <nav className="gym-drawer-nav" aria-label="모바일 메뉴">
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
          <button type="button" className="gym-btn primary gym-drawer-cta" onClick={() => { closeDrawer(); scrollToId('contact'); }}>
            상담 신청
          </button>
        </div>
      </div>
    </>
  );
}
