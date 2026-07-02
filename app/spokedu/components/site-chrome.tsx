'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  brandContactLinks,
  brandProfile,
  getSocialLinks,
  siteNav,
  SPOKEDU_BASE_PATH,
  type SiteNavEntry,
  type SiteNavLink,
} from '../data/site';
import { inferTrackFromHref } from '../lib/tracking';
import { koreanText, siteContainer } from '../lib/ui-classes';
import { isExternalHref, externalLinkProps } from '../lib/external-link';

const ATHLETIC_BLUE = '#1D4ED8';
const NAVY = '#0B1220';

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isLinkActive(pathname: string, href: string, matchPrefix?: string): boolean {
  const current = normalizePath(pathname);
  if (href.includes('#')) {
    const base = href.split('#')[0];
    return current === base || current.startsWith(`${base}/`);
  }
  if (matchPrefix) {
    return current === `${SPOKEDU_BASE_PATH}${matchPrefix}` || current.startsWith(`${SPOKEDU_BASE_PATH}${matchPrefix}/`);
  }
  return current === href;
}

function isGroupActive(pathname: string, children: SiteNavLink[]): boolean {
  return children.some((child) => {
    const base = child.href.split('#')[0];
    const prefix = base.replace(SPOKEDU_BASE_PATH, '');
    return isLinkActive(pathname, child.href, prefix || undefined);
  });
}

function NavAnchor({
  href,
  trackLabel,
  className,
  style,
  children,
  onNavigate,
}: {
  href: string;
  trackLabel: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const external = isExternalHref(href);
  const props = {
    'data-track': inferTrackFromHref(href),
    'data-track-label': trackLabel,
    className,
    style,
    onClick: onNavigate,
  };

  if (external) {
    return (
      <a href={href} {...externalLinkProps} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/spokedu';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [mobileProgramsOpen, setMobileProgramsOpen] = useState(false);
  const programsButtonRef = useRef<HTMLButtonElement>(null);
  const programsPanelRef = useRef<HTMLDivElement>(null);
  const mobileProgramsId = useId();

  const onHero = isHome && !scrolled;
  const closeMenus = useCallback(() => {
    setMenuOpen(false);
    setProgramsOpen(false);
    setMobileProgramsOpen(false);
  }, []);

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useEffect(() => {
    closeMenus();
  }, [pathname, closeMenus]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenus();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen, closeMenus]);

  useEffect(() => {
    if (!programsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        programsPanelRef.current?.contains(target) ||
        programsButtonRef.current?.contains(target)
      ) {
        return;
      }
      setProgramsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProgramsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [programsOpen]);

  const linkClass = (active: boolean) =>
    `text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
      onHero
        ? active
          ? 'text-[#0a2540]'
          : 'text-[#425466] hover:text-[#0a2540] focus-visible:outline-[#635bff]'
        : active
          ? 'text-[#0B1220]'
          : 'text-slate-600 hover:text-[#0B1220] focus-visible:outline-blue-600'
    }`;

  const renderDesktopEntry = (entry: SiteNavEntry) => {
    if (entry.type === 'link') {
      const active = isLinkActive(pathname, entry.href, entry.matchPrefix);
      return (
        <NavAnchor
          key={entry.href}
          href={entry.href}
          trackLabel={entry.trackLabel}
          className={linkClass(active)}
        >
          {entry.label}
        </NavAnchor>
      );
    }

    const groupActive = isGroupActive(pathname, entry.children);
    return (
      <div key={entry.label} className="relative">
        <button
          ref={programsButtonRef}
          type="button"
          className={`inline-flex items-center gap-1 ${linkClass(groupActive || programsOpen)}`}
          aria-expanded={programsOpen}
          aria-controls="desktop-programs-menu"
          aria-haspopup="true"
          onClick={() => setProgramsOpen((open) => !open)}
        >
          {entry.label}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className={programsOpen ? 'rotate-180' : ''}>
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {programsOpen ? (
          <div
            id="desktop-programs-menu"
            ref={programsPanelRef}
            role="menu"
            className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[13.5rem] border border-slate-200 bg-white py-1.5 shadow-sm"
          >
            {entry.children.map((child) => (
              <NavAnchor
                key={child.href}
                href={child.href}
                trackLabel={child.trackLabel}
                className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1D4ED8]"
                onNavigate={() => setProgramsOpen(false)}
              >
                {child.label}
              </NavAnchor>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderMobileEntry = (entry: SiteNavEntry) => {
    if (entry.type === 'link') {
      const active = isLinkActive(pathname, entry.href, entry.matchPrefix);
      return (
        <NavAnchor
          key={entry.href}
          href={entry.href}
          trackLabel={`mobile-${entry.trackLabel}`}
          className={`flex min-h-12 items-center border-b border-white/10 text-base font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            active ? 'text-white' : 'text-white/90'
          }`}
          onNavigate={closeMenus}
        >
          {entry.label}
        </NavAnchor>
      );
    }

    return (
      <div key={entry.label} className="border-b border-white/10">
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-between text-base font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-expanded={mobileProgramsOpen}
          aria-controls={mobileProgramsId}
          onClick={() => setMobileProgramsOpen((open) => !open)}
        >
          {entry.label}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={mobileProgramsOpen ? 'rotate-180' : ''}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {mobileProgramsOpen ? (
          <div id={mobileProgramsId} className="pb-2 pl-3">
            {entry.children.map((child) => (
              <NavAnchor
                key={child.href}
                href={child.href}
                trackLabel={`mobile-${child.trackLabel}`}
                className="flex min-h-11 items-center text-[15px] text-white/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onNavigate={closeMenus}
              >
                {child.label}
              </NavAnchor>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <header
      className={`${isHome ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 transition-all duration-300 ${
        onHero
          ? 'border-b border-slate-200/40 bg-[#f6f9fc]/75 backdrop-blur-xl'
          : 'border-b border-slate-200/70 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl'
      }`}
    >
      <div className={`${siteContainer} flex items-center justify-between gap-3 py-4 sm:py-[1.125rem]`}>
        <Link
          href={SPOKEDU_BASE_PATH}
          className={`text-[13px] font-semibold tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            onHero
              ? 'text-[#0a2540] focus-visible:outline-[#635bff]'
              : 'text-[#0B1220] focus-visible:outline-blue-600'
          }`}
        >
          {brandProfile.nameEn}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="주 메뉴">
          {siteNav.map(renderDesktopEntry)}
        </nav>

        <div className="flex items-center gap-2">
          <NavAnchor
            href={`${SPOKEDU_BASE_PATH}/contact`}
            trackLabel="header-contact"
            className={`hidden min-h-11 items-center justify-center rounded-full px-5 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex sm:text-[13px] ${
              onHero
                ? 'bg-[#0a2540] text-white hover:bg-[#0d2d4f] focus-visible:outline-[#635bff]'
                : 'text-white hover:opacity-90 focus-visible:outline-blue-600'
            }`}
            style={onHero ? undefined : { backgroundColor: ATHLETIC_BLUE }}
          >
            문의하기
          </NavAnchor>

          <button
            type="button"
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 lg:hidden ${
              onHero
                ? 'border-slate-300/80 text-[#0a2540] focus-visible:outline-[#635bff]'
                : 'border-slate-300 text-[#0B1220] focus-visible:outline-blue-600'
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? '메뉴 닫기' : '메뉴 열기'}</span>
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="mobile-nav-panel"
          className="fixed inset-0 top-[57px] z-50 lg:hidden"
          style={{ backgroundColor: `${NAVY}f2` }}
          role="dialog"
          aria-modal="true"
          aria-label="모바일 메뉴"
        >
          <nav className="flex flex-col px-5 py-4 backdrop-blur-md">
            {siteNav.map(renderMobileEntry)}
            <NavAnchor
              href={`${SPOKEDU_BASE_PATH}/contact`}
              trackLabel="mobile-header-contact"
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-md px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ backgroundColor: ATHLETIC_BLUE }}
              onNavigate={closeMenus}
            >
              문의하기
            </NavAnchor>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  const socialLinks = getSocialLinks();
  const blogLink = socialLinks.find((c) => c.key === 'naver-blog');

  const programLinks = [
    { label: '개인·소그룹 수업', href: `${SPOKEDU_BASE_PATH}/private`, trackLabel: 'footer-program-private' },
    { label: '기관 출강', href: `${SPOKEDU_BASE_PATH}/dispatch`, trackLabel: 'footer-program-dispatch' },
    { label: '특수체육', href: `${SPOKEDU_BASE_PATH}/dispatch#special`, trackLabel: 'footer-program-special' },
    { label: '커리큘럼·지도자 교육', href: `${SPOKEDU_BASE_PATH}/curriculum`, trackLabel: 'footer-program-curriculum' },
    { label: 'SPOMOVE', href: `${SPOKEDU_BASE_PATH}/programs/spomove`, trackLabel: 'footer-program-spomove' },
  ];

  const infoLinks = [
    { label: '스포키듀 소개', href: `${SPOKEDU_BASE_PATH}/about`, trackLabel: 'footer-info-about' },
    { label: '수업 사례', href: `${SPOKEDU_BASE_PATH}/records`, trackLabel: 'footer-info-records' },
    { label: '문의', href: `${SPOKEDU_BASE_PATH}/contact`, trackLabel: 'footer-info-contact' },
  ];

  const footerLinkClass =
    'text-[15px] leading-relaxed text-white/75 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  return (
    <footer style={{ backgroundColor: NAVY }} className="text-white">
      <div className={`${siteContainer} py-14 sm:py-16`}>
        <div className="grid grid-cols-1 gap-10 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4 min-[1200px]:items-start min-[1200px]:gap-12">
          <div className="min-w-0 space-y-4 min-[640px]:col-span-2 min-[1200px]:col-span-1">
            <Link href={SPOKEDU_BASE_PATH} className="inline-block text-lg font-bold tracking-[0.14em] text-white">
              {brandProfile.nameEn}
            </Link>
            <p className={`text-[15px] font-medium text-white/90 ${koreanText}`}>{brandProfile.nameKo}</p>
            <p className={`max-w-sm text-[15px] leading-relaxed text-white/70 ${koreanText}`}>{brandProfile.tagline}</p>
            <p className={`text-sm text-white/55 ${koreanText}`}>운영지역 {brandProfile.serviceArea}</p>
          </div>

          <div className="min-w-0">
            <p className={`text-sm font-semibold tracking-wide text-white/50 ${koreanText}`}>프로그램</p>
            <ul className="mt-4 space-y-2.5">
              {programLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} data-track={inferTrackFromHref(link.href)} data-track-label={link.trackLabel} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <p className={`text-sm font-semibold tracking-wide text-white/50 ${koreanText}`}>정보</p>
            <ul className="mt-4 space-y-2.5">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} data-track={inferTrackFromHref(link.href)} data-track-label={link.trackLabel} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <p className={`text-sm font-semibold tracking-wide text-white/50 ${koreanText}`}>연락처</p>
            <ul className="mt-4 space-y-3 text-[15px] text-white/80">
              <li>
                <span className="text-white/55">대표 </span>
                {brandProfile.representative}
              </li>
              <li>
                <a id="footer-phone-link" href={brandContactLinks.phone} data-track="cta-phone" data-track-label="footer-phone" className={footerLinkClass}>
                  {brandProfile.phone}
                </a>
              </li>
              <li>
                <a id="footer-email-link" href={brandContactLinks.email} data-track="cta-email" data-track-label="footer-email" className={`${footerLinkClass} break-all`}>
                  {brandProfile.email}
                </a>
              </li>
              {blogLink ? (
                <li>
                  <a
                    href={blogLink.href}
                    target="_blank"
                    rel="noreferrer"
                    data-track="external-naver-blog"
                    data-track-label="footer-naver-blog"
                    className={footerLinkClass}
                  >
                    네이버 블로그
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-sm text-white/45">
            © {new Date().getFullYear()} {brandProfile.nameEn}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
