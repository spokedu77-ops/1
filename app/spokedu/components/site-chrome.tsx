'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  brandContactLinks,
  brandProfile,
  footerNavLinks,
  footerServiceLinks,
  getSocialLinks,
  siteHeaderCta,
  siteNav,
  isSpokeduHomePath,
  type SiteNavEntry,
  type SiteNavLink,
} from '../data/site';
import { BrandLogo } from './brand-logo';
import { isExternalHref, externalLinkProps } from '../lib/external-link';
import { lockSpokeduScroll, getSpokeduScrollY, scrollSpokeduToTop, unlockSpokeduScroll } from '../lib/scroll';
import { inferTrackFromHref } from '../lib/tracking';
import { brandBlue, brandNavy, koreanText, siteContainer } from '../lib/ui-classes';

const ATHLETIC_BLUE = brandBlue;
const NAVY = brandNavy;

function stripQueryAndHash(href: string): string {
  return href.split('#')[0]?.split('?')[0] ?? href;
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isLinkActive(pathname: string, href: string, matchPrefix?: string): boolean {
  const current = normalizePath(pathname);
  const hrefPath = normalizePath(stripQueryAndHash(href));
  if (matchPrefix) {
    const prefixPath = matchPrefix.includes('?') ? stripQueryAndHash(matchPrefix) : matchPrefix;
    return current === prefixPath || current.startsWith(`${prefixPath}/`);
  }
  return current === hrefPath || current.startsWith(`${hrefPath}/`);
}

function isGroupActive(pathname: string, children: SiteNavLink[]): boolean {
  return children.some((child) => {
    const base = stripQueryAndHash(child.href);
    return isLinkActive(pathname, child.href, base || undefined);
  });
}

function NavAnchor({
  href,
  trackLabel,
  className,
  style,
  children,
  onNavigate,
  role,
}: {
  href: string;
  trackLabel: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onNavigate?: () => void;
  role?: string;
}) {
  const external = isExternalHref(href);
  const props = {
    'data-track': inferTrackFromHref(href),
    'data-track-label': trackLabel,
    className,
    style,
    role,
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
  const isHome = isSpokeduHomePath(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const desktopGroupButtonRef = useRef<HTMLButtonElement>(null);
  const desktopGroupPanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileProgramsId = useId();

  const onHero = isHome && !scrolled;
  const closeMenus = useCallback(() => {
    setMenuOpen(false);
    setOpenDesktopGroup(null);
    setOpenMobileGroup(null);
  }, []);

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(getSpokeduScrollY() > 56);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [isHome]);

  useEffect(() => {
    closeMenus();
  }, [pathname, closeMenus]);

  useEffect(() => {
    if (!menuOpen) {
      unlockSpokeduScroll();
      return;
    }
    lockSpokeduScroll();
    const panel = mobilePanelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenus();
        menuButtonRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !focusables?.length) return;
      const list = Array.from(focusables);
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockSpokeduScroll();
    };
  }, [menuOpen, closeMenus]);

  useEffect(() => {
    if (!openDesktopGroup) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        desktopGroupPanelRef.current?.contains(target) ||
        desktopGroupButtonRef.current?.contains(target)
      ) {
        return;
      }
      setOpenDesktopGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDesktopGroup(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openDesktopGroup]);

  const linkClass = (active: boolean) =>
    `inline-flex h-9 items-center text-[13px] font-medium leading-none tracking-[-0.01em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
      onHero
        ? active
          ? 'text-white underline decoration-white/80 underline-offset-[6px]'
          : 'text-white/80 hover:text-white focus-visible:outline-white'
        : active
          ? 'text-[#0B1F46] underline decoration-[#245DFF]/70 underline-offset-[6px]'
          : 'text-slate-600 hover:text-[#0B1F46] focus-visible:outline-[#245DFF]'
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

    const groupOpen = openDesktopGroup === entry.label;
    const groupActive = isGroupActive(pathname, entry.children);
    const menuId = `desktop-nav-group-${entry.trackLabel}`;
    return (
      <div key={entry.label} className="relative flex h-9 items-center">
        <button
          ref={groupOpen ? desktopGroupButtonRef : undefined}
          type="button"
          className={`inline-flex h-9 items-center gap-1 ${linkClass(groupActive || groupOpen)}`}
          aria-expanded={groupOpen}
          aria-controls={menuId}
          aria-haspopup="true"
          onClick={() => setOpenDesktopGroup((current) => (current === entry.label ? null : entry.label))}
        >
          {entry.label}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            className={`shrink-0 transition-transform ${groupOpen ? 'rotate-180' : ''}`}
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {groupOpen ? (
          <div
            id={menuId}
            ref={desktopGroupPanelRef}
            role="menu"
            className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[13.5rem] border border-slate-200 bg-white py-1.5 shadow-sm"
          >
            {entry.children.map((child) => (
              <NavAnchor
                key={child.href}
                href={child.href}
                trackLabel={child.trackLabel}
                role="menuitem"
                className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#245DFF]"
                onNavigate={() => setOpenDesktopGroup(null)}
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

    const groupOpen = openMobileGroup === entry.label;
    const panelId = `${mobileProgramsId}-${entry.trackLabel}`;
    return (
      <div key={entry.label} className="border-b border-white/10">
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-between text-base font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-expanded={groupOpen}
          aria-controls={panelId}
          onClick={() => setOpenMobileGroup((current) => (current === entry.label ? null : entry.label))}
        >
          {entry.label}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={groupOpen ? 'rotate-180' : ''}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {groupOpen ? (
          <div id={panelId} className="pb-2 pl-3">
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
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)] transition-all duration-300 ${
          onHero
            ? 'border-b border-white/10 bg-[#0B1F46]/40 backdrop-blur-md'
            : 'border-b border-[#DCE3EE]/90 bg-white/92 shadow-[0_1px_0_rgba(15,33,70,0.04)] backdrop-blur-xl'
        }`}
      >
        <div className={`${siteContainer} flex h-14 items-center justify-between gap-3 sm:h-[3.75rem]`}>
          <BrandLogo onDark={onHero} scrollHomeOnClick size="sm" />

          <nav className="hidden h-9 items-center gap-7 lg:flex" aria-label="주 메뉴">
            {siteNav.map(renderDesktopEntry)}
          </nav>

          <div className="flex h-9 items-center gap-2">
            <NavAnchor
              href={siteHeaderCta.href}
              trackLabel={siteHeaderCta.trackLabel}
              className={`hidden h-9 items-center justify-center rounded-full px-5 text-[13px] font-semibold leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex ${
                menuOpen
                  ? 'pointer-events-none invisible'
                  : onHero
                    ? 'border border-white/35 bg-white text-[#0B1F46] hover:bg-white/90 focus-visible:outline-white'
                    : 'text-white focus-visible:outline-[#245DFF]'
              }`}
              style={onHero || menuOpen ? undefined : { backgroundColor: ATHLETIC_BLUE }}
            >
              {siteHeaderCta.label}
            </NavAnchor>

            <button
              ref={menuButtonRef}
              type="button"
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 lg:hidden ${
                onHero
                  ? 'border-white/35 text-white focus-visible:outline-white'
                  : 'border-slate-300 text-[#0B1F46] focus-visible:outline-[#245DFF]'
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
      </header>

      {/*
        헤더에 backdrop-blur가 있으면 fixed 자손이 헤더 박스에 묶여
        오버레이 높이가 0에 가깝게 깨진다. 패널은 헤더 밖으로 둔다.
      */}
      <div
        id="mobile-nav-panel"
        ref={mobilePanelRef}
        className={`fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-50 sm:top-[calc(3.75rem+env(safe-area-inset-top,0px))] lg:hidden ${
          menuOpen ? '' : 'pointer-events-none invisible'
        }`}
        style={{ backgroundColor: menuOpen ? `${NAVY}f2` : undefined }}
        role="dialog"
        aria-modal={menuOpen}
        aria-label="모바일 메뉴"
        aria-hidden={!menuOpen}
        hidden={!menuOpen}
      >
        <nav className="flex h-full flex-col overflow-y-auto px-5 py-4 backdrop-blur-md sm:pt-1">
          {siteNav.map(renderMobileEntry)}
          <div className="mt-4 grid gap-2">
            <NavAnchor
              href={siteHeaderCta.href}
              trackLabel={`mobile-${siteHeaderCta.trackLabel}`}
              className="inline-flex min-h-12 items-center justify-center rounded-md px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ backgroundColor: ATHLETIC_BLUE }}
              onNavigate={closeMenus}
            >
              {siteHeaderCta.label}
            </NavAnchor>
          </div>
        </nav>
      </div>
    </>
  );
}

export function SiteFooter() {
  const socialLinks = getSocialLinks();
  const blogLink = socialLinks.find((c) => c.key === 'naver-blog');
  const kakaoLink = socialLinks.find((c) => c.key === 'kakao-channel');
  const instagramLink = socialLinks.find((c) => c.key === 'instagram');

  const footerLinkClass =
    `inline-flex min-h-8 items-center text-[14px] font-medium leading-none tracking-[-0.01em] text-white/80 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${koreanText}`;
  const footerHeadingClass = `text-[12px] font-semibold uppercase tracking-[0.12em] text-white/60 ${koreanText}`;

  return (
    <footer style={{ backgroundColor: NAVY }} className="text-white">
      <div className={`${siteContainer} py-9 sm:py-11`}>
        <div className="grid grid-cols-1 gap-8 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4 min-[1200px]:items-start min-[1200px]:gap-10">
          <div className="min-w-0 space-y-2.5 min-[640px]:col-span-2 min-[1200px]:col-span-1">
            <BrandLogo onDark scrollHomeOnClick size="md" />
            <p className={`text-[14px] font-semibold leading-none text-white ${koreanText}`}>{brandProfile.nameKo}</p>
            <p className={`max-w-sm text-[14px] leading-[1.55] text-white/65 ${koreanText}`}>{brandProfile.tagline}</p>
            <p className={`text-[13px] leading-none text-white/45 ${koreanText}`}>운영지역 {brandProfile.serviceArea}</p>
          </div>

          <div className="min-w-0">
            <p className={footerHeadingClass}>탐색</p>
            <ul className="mt-3 space-y-0.5">
              {footerNavLinks.map((link) => (
                <li key={link.href} className="flex">
                  <Link href={link.href} data-track={inferTrackFromHref(link.href)} data-track-label={link.trackLabel} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <p className={footerHeadingClass}>수업 경로</p>
            <ul className="mt-3 space-y-0.5">
              {footerServiceLinks.map((link) => (
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
            <ul className="mt-3 space-y-0.5">
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
              {instagramLink ? (
                <li className="flex">
                  <a
                    href={instagramLink.href}
                    target="_blank"
                    rel="noreferrer"
                    data-track="external-instagram"
                    data-track-label="footer-instagram"
                    className={footerLinkClass}
                  >
                    인스타그램
                  </a>
                </li>
              ) : null}
              {kakaoLink ? (
                <li className="flex">
                  <a
                    href={kakaoLink.href}
                    target="_blank"
                    rel="noreferrer"
                    data-track="external-kakao-channel"
                    data-track-label="footer-kakao-channel"
                    className={footerLinkClass}
                  >
                    카카오채널
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex min-h-9 items-center border-t border-white/10 pt-4">
          <p className="text-[12px] leading-none tracking-[-0.01em] text-white/40">
            © {new Date().getFullYear()} {brandProfile.nameEn}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
