'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LandingAuthControls } from './LandingAuthControls';
import { spokeduLabIntroductionHref } from '@/app/spokedu/data/public-routes';
import { useLandingSession } from '../useLandingSession';
import styles from '../landing.module.css';

const LANDING_NAV = [
  ['서비스', '#workflow'],
  ['놀이체육', '#library'],
  ['SPOMOVE', '#spomove'],
  ['요금제', '#plans'],
  ['자주 묻는 질문', '#faq'],
] as const;

export function LandingNavigation({ loginHref, freeStartHref }: { loginHref: string; freeStartHref: string }) {
  const session = useLandingSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const focusable = mobilePanelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    media.addEventListener('change', closeAtDesktop);
    return () => media.removeEventListener('change', closeAtDesktop);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={styles.masterLocalNav} data-spokedu-master-local-nav="true">
        <div className={styles.masterLocalNavInner}>
          <Link href={spokeduLabIntroductionHref()} className={styles.masterLocalBrand} aria-label="SPOKEDU LAB 홈" onClick={closeMenu}>
            <span>SPOKEDU</span>
            <strong>LAB</strong>
          </Link>
          <nav className={styles.masterLocalLinks} aria-label="SPOKEDU LAB 주요 메뉴">
            {LANDING_NAV.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <div className={styles.desktopAuthControls}>
            <LandingAuthControls loginHref={loginHref} freeStartHref={freeStartHref} session={session} variant="desktop" />
          </div>
          <div className={styles.mobileHeaderActions}>
            <LandingAuthControls loginHref={loginHref} freeStartHref={freeStartHref} session={session} variant="mobile-primary" />
            <button
              ref={menuButtonRef}
              type="button"
              className={styles.mobileMenuButton}
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={menuOpen}
              aria-controls="lab-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden>{menuOpen ? '×' : '☰'}</span>
            </button>
          </div>
        </div>
      </header>
      {menuOpen ? (
        <>
          <button type="button" className={styles.mobileMenuBackdrop} aria-label="메뉴 닫기" onClick={closeMenu} />
          <div ref={mobilePanelRef} id="lab-mobile-menu" className={styles.mobileMenuPanel} role="dialog" aria-modal="true" aria-label="SPOKEDU LAB 모바일 메뉴">
            <nav aria-label="SPOKEDU LAB 모바일 메뉴">
              {LANDING_NAV.map(([label, href]) => <a key={href} href={href} onClick={closeMenu}>{label}</a>)}
              <LandingAuthControls loginHref={loginHref} freeStartHref={freeStartHref} session={session} variant="mobile-menu" onNavigate={closeMenu} />
              <Link href="/" onClick={closeMenu}>SPOKEDU 홈페이지</Link>
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
