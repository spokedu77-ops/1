'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GYM_CONFIG } from '../data/config';

const NAV_LINKS = [
  { href: '#target', label: '우리 아이 어디에 맞나요?' },
  { href: '#reviews', label: '학부모 후기' },
  { href: '#why-spokedu', label: '수업이 다른 이유' },
  { href: '#pricing', label: '가격/체험' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: '체험/상담' },
] as const;

/** 데스크톱용 3~4개 항으로 묶음 */
const NAV_GROUPS = [
  { key: 'fit', label: '맞춤 안내', ids: ['target', 'reviews'] as const },
  { key: 'guide', label: '등록 안내', ids: ['why-spokedu', 'pricing', 'faq'] as const },
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
