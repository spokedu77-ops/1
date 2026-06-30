'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { siteNavItems as navItems } from '../data/site';
import {
  brandContactLinks,
  brandProfile,
  footerLinks,
  footerSupplementaryLinks,
  getSocialLinks,
  SPOKEDU_BASE_PATH,
} from '../data/site';
import { inferTrackFromHref } from '../lib/tracking';

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/spokedu';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const onHero = isHome && !scrolled;

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
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header
      className={`${isHome ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 transition-colors duration-300 ${
        onHero
          ? 'border-b border-white/10 bg-[#0B1220]/35 backdrop-blur-sm'
          : 'border-b border-slate-200 bg-white/95 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-5 py-3.5 sm:gap-4 sm:px-8 sm:py-4 lg:px-12">
        <Link
          href={SPOKEDU_BASE_PATH}
          className={`text-[13px] font-semibold tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            onHero
              ? 'text-white focus-visible:outline-white'
              : 'text-[#0B1220] focus-visible:outline-blue-600'
          }`}
        >
          {brandProfile.nameEn}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="주 메뉴">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={`nav-${item.label}`}
              className={`text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                onHero
                  ? 'text-white/85 hover:text-white focus-visible:outline-white'
                  : 'text-slate-600 hover:text-[#0B1220] focus-visible:outline-blue-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={`${SPOKEDU_BASE_PATH}/contact`}
            id="header-contact-button"
            data-track="cta-contact"
            data-track-label="header-contact"
            className={`hidden min-h-11 items-center justify-center rounded-md px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex sm:text-[13px] ${
              onHero
                ? 'border border-white/40 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white'
                : 'bg-[#1D4ED8] text-white hover:bg-blue-700 focus-visible:outline-blue-600'
            }`}
          >
            문의하기
          </Link>

          <button
            type="button"
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 lg:hidden ${
              onHero
                ? 'border-white/40 text-white focus-visible:outline-white'
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
          className="fixed inset-0 top-[57px] z-50 bg-[#0B1220]/95 backdrop-blur-md lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="모바일 메뉴"
        >
          <nav className="flex flex-col gap-1 px-5 py-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={`mobile-nav-${item.label}`}
                className="flex min-h-12 items-center border-b border-white/10 text-base font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={`${SPOKEDU_BASE_PATH}/contact`}
              data-track="cta-contact"
              data-track-label="mobile-header-contact"
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-md bg-[#1D4ED8] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => setMenuOpen(false)}
            >
              문의하기
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  const socialLinks = getSocialLinks();

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-wide text-[#0B1220]">
              {brandProfile.nameEn}
              <span className="mx-2 font-normal text-slate-400">/</span>
              {brandProfile.nameKo}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-slate-600">{brandProfile.tagline}</p>
            <p className="text-sm text-slate-500">운영지역 {brandProfile.serviceArea}</p>
          </div>
          <div className="grid gap-1.5 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-800">대표</span> {brandProfile.representative}
            </p>
            <p>
              <span className="font-medium text-slate-800">연락처</span>{' '}
              <a
                id="footer-phone-link"
                data-track="cta-phone"
                data-track-label="footer-phone"
                href={brandContactLinks.phone}
                className="underline-offset-2 hover:underline"
              >
                {brandProfile.phone}
              </a>
            </p>
            <p>
              <span className="font-medium text-slate-800">이메일</span>{' '}
              <a
                id="footer-email-link"
                data-track="cta-email"
                data-track-label="footer-email"
                href={brandContactLinks.email}
                className="underline-offset-2 hover:underline"
              >
                {brandProfile.email}
              </a>
            </p>
          </div>
        </div>

        <nav aria-label="사이트 메뉴" className="border-t border-slate-200 pt-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  data-track={inferTrackFromHref(link.href)}
                  data-track-label={`footer-nav-${link.label}`}
                  className="text-xs font-medium text-slate-500 transition hover:text-[#0B1220]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {footerSupplementaryLinks.length > 0 ? (
          <nav aria-label="추가 콘텐츠" className="border-t border-slate-200 pt-4">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {footerSupplementaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-track={inferTrackFromHref(link.href)}
                    data-track-label={`footer-supplementary-${link.label}`}
                    className="text-xs font-medium text-slate-500 transition hover:text-[#0B1220]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {socialLinks.length > 0 ? (
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">공식 채널</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {socialLinks.map((channel) => (
                <a
                  key={channel.key}
                  href={channel.href}
                  target="_blank"
                  rel="noreferrer"
                  data-track={`external-${channel.key}`}
                  data-track-label={`footer-${channel.key}`}
                  className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-[#0B1220]"
                >
                  {channel.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
