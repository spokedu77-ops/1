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
import { BrandLogo } from './brand-logo';
import { isExternalHref, externalLinkProps } from '../lib/external-link';
import { scrollSpokeduToTop } from '../lib/scroll';
import { inferTrackFromHref } from '../lib/tracking';
import { koreanText, siteContainer } from '../lib/ui-classes';

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
    onClick: () => {
      // 해시 앵커가 아니면 네비 클릭 시 항상 맨 위부터 (fullscreen 스크롤 잔여 방지)
      if (!href.includes('#')) {
        scrollSpokeduToTop();
      }
      onNavigate?.();
    },
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
    `inline-flex h-9 items-center text-[13px] font-medium leading-none tracking-[-0.01em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
      onHero
        ? active
          ? 'text-white underline decoration-white/80 underline-offset-[6px]'
          : 'text-white/80 hover:text-white focus-visible:outline-white'
        : active
          ? 'text-[#0B1220] underline decoration-[#1D4ED8]/70 underline-offset-[6px]'
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
      <div key={entry.label} className="relative flex h-9 items-center">
        <button
          ref={programsButtonRef}
          type="button"
          className={`inline-flex h-9 items-center gap-1 ${linkClass(groupActive || programsOpen)}`}
          aria-expanded={programsOpen}
          aria-controls="desktop-programs-menu"
          aria-haspopup="true"
          onClick={() => setProgramsOpen((open) => !open)}
        >
          {entry.label}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            className={`shrink-0 transition-transform ${programsOpen ? 'rotate-180' : ''}`}
          >
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
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        onHero
          ? 'border-b border-white/10 bg-[#0B1220]/35 backdrop-blur-md'
          : 'border-b border-slate-200/70 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl'
      }`}
    >
      <div className={`${siteContainer} flex h-14 items-center justify-between gap-3 sm:h-[3.75rem]`}>
        <BrandLogo onDark={onHero} scrollHomeOnClick size="sm" />

        <nav className="hidden h-9 items-center gap-7 lg:flex" aria-label="주 메뉴">
          {siteNav.map(renderDesktopEntry)}
        </nav>

        <div className="flex h-9 items-center gap-2">
          <NavAnchor
            href={`${SPOKEDU_BASE_PATH}/contact`}
            trackLabel="header-contact"
            className={`hidden h-9 items-center justify-center rounded-full px-5 text-[13px] font-semibold leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex ${
              onHero
                ? 'border border-white/35 bg-white text-[#0B1220] hover:bg-white/90 focus-visible:outline-white'
                : 'text-white focus-visible:outline-blue-600'
            }`}
            style={onHero ? undefined : { backgroundColor: ATHLETIC_BLUE }}
          >
            상담하기
          </NavAnchor>

          <button
            type="button"
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 lg:hidden ${
              onHero
                ? 'border-white/35 text-white focus-visible:outline-white'
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
            <div className="mt-4 grid gap-2">
              <NavAnchor
                href={`${SPOKEDU_BASE_PATH}/contact`}
                trackLabel="mobile-header-contact"
                className="inline-flex min-h-12 items-center justify-center rounded-md px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ backgroundColor: ATHLETIC_BLUE }}
                onNavigate={closeMenus}
              >
                상담하기
              </NavAnchor>
            </div>
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
    { label: '기관 프로그램', href: `${SPOKEDU_BASE_PATH}/dispatch`, trackLabel: 'footer-program-dispatch' },
    { label: '커리큘럼·지도자 교육', href: `${SPOKEDU_BASE_PATH}/curriculum`, trackLabel: 'footer-program-curriculum' },
    { label: 'SPOMOVE', href: `${SPOKEDU_BASE_PATH}/programs/spomove`, trackLabel: 'footer-program-spomove' },
  ];

  const infoLinks = [
    { label: '스포키듀 소개', href: `${SPOKEDU_BASE_PATH}/about`, trackLabel: 'footer-info-about' },
    { label: '수업 사례', href: `${SPOKEDU_BASE_PATH}/records`, trackLabel: 'footer-info-records' },
    { label: '인사이트', href: `${SPOKEDU_BASE_PATH}/insights`, trackLabel: 'footer-info-insights' },
    { label: '문의', href: `${SPOKEDU_BASE_PATH}/contact`, trackLabel: 'footer-info-contact' },
  ];

  const footerLinkClass =
    `inline-flex min-h-8 items-center text-[14px] font-medium leading-none tracking-[-0.01em] text-white/75 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${koreanText}`;
  const footerHeadingClass = `text-[12px] font-semibold uppercase tracking-[0.12em] text-white/45 ${koreanText}`;

  return (
    <footer style={{ backgroundColor: NAVY }} className="text-white">
      <div className={`${siteContainer} py-12 sm:py-14`}>
        <div className="grid grid-cols-1 gap-10 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4 min-[1200px]:items-start min-[1200px]:gap-12">
          <div className="min-w-0 space-y-3.5 min-[640px]:col-span-2 min-[1200px]:col-span-1">
            <BrandLogo onDark scrollHomeOnClick size="md" />
            <p className={`text-[14px] font-semibold leading-none text-white ${koreanText}`}>{brandProfile.nameKo}</p>
            <p className={`max-w-sm text-[14px] leading-[1.65] text-white/65 ${koreanText}`}>{brandProfile.tagline}</p>
            <p className={`text-[13px] leading-none text-white/45 ${koreanText}`}>운영지역 {brandProfile.serviceArea}</p>
          </div>

          <div className="min-w-0">
            <p className={footerHeadingClass}>프로그램</p>
            <ul className="mt-4 space-y-1">
              {programLinks.map((link) => (
                <li key={link.href} className="flex">
                  <Link href={link.href} data-track={inferTrackFromHref(link.href)} data-track-label={link.trackLabel} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <p className={footerHeadingClass}>정보</p>
            <ul className="mt-4 space-y-1">
              {infoLinks.map((link) => (
                <li key={link.href} className="flex">
                  <Link href={link.href} data-track={inferTrackFromHref(link.href)} data-track-label={link.trackLabel} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <p className={footerHeadingClass}>연락처</p>
            <ul className="mt-4 space-y-1">
              <li className={`flex min-h-8 items-center text-[14px] leading-none text-white/80 ${koreanText}`}>
                <span className="text-white/45">대표&nbsp;</span>
                {brandProfile.representative}
              </li>
              <li className="flex">
                <a id="footer-phone-link" href={brandContactLinks.phone} data-track="cta-phone" data-track-label="footer-phone" className={footerLinkClass}>
                  {brandProfile.phone}
                </a>
              </li>
              <li className="flex">
                <a id="footer-email-link" href={brandContactLinks.email} data-track="cta-email" data-track-label="footer-email" className={`${footerLinkClass} break-all`}>
                  {brandProfile.email}
                </a>
              </li>
              {blogLink ? (
                <li className="flex">
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

        <div className="mt-10 flex min-h-10 items-center border-t border-white/10 pt-5">
          <p className="text-[12px] leading-none tracking-[-0.01em] text-white/40">
            © {new Date().getFullYear()} {brandProfile.nameEn}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
