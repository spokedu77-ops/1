'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '#about', label: '철학' },
  { href: '#curriculum', label: '커리큘럼' },
  { href: '#class-flow', label: '수업 현장' },
  { href: '#diagnosis', label: '성향 진단' },
  { href: '#reviews', label: '후기' },
];

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <div
        className={`pl-drawer-backdrop ${drawerOpen ? 'show' : ''}`}
        aria-hidden={!drawerOpen}
        onClick={closeDrawer}
        role="presentation"
      />
      <aside
        className={`pl-drawer ${drawerOpen ? 'open' : ''}`}
        aria-hidden={!drawerOpen}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="#top" className="pl-brand" onClick={closeDrawer}>
            <div className="pl-brand-logo">S</div>
            SPOKEDU
          </Link>
          <button
            type="button"
            className="pl-burger"
            onClick={closeDrawer}
            aria-label="메뉴 닫기"
            style={{ display: 'flex' }}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="pl-drawer-links">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={closeDrawer}>
              {label}
            </Link>
          ))}
          <Link href="#apply" onClick={closeDrawer}>
            상담 접수
          </Link>
        </div>
      </aside>

      <header className="pl-header">
        <div className="pl-container pl-nav">
          <Link href="#top" className="pl-brand">
            <div className="pl-brand-logo">S</div>
            <span>SPOKEDU</span>
          </Link>
          <nav className="pl-menu">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="pl-actions">
            <button
              type="button"
              className="pl-burger"
              id="burgerBtn"
              onClick={() => setDrawerOpen(true)}
              aria-label="메뉴 열기"
            >
              <MenuIcon />
            </button>
            <a className="pl-btn pl-btn-outline" href="tel:010-0000-0000">
              유선 문의
            </a>
            <Link className="pl-btn pl-btn-primary" href="#apply" style={{ color: '#09090b' }}>
              상담 접수
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
