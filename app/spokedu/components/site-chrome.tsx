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

  const onHero = false;

  return (
    <header
      className={`${isHome ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 transition-colors duration-300 ${
        onHero
          ? 'border-b border-white/10 bg-gradient-to-b from-black/45 to-black/0 backdrop-blur-[2px]'
          : 'border-b border-stone-300/55 bg-[#F4F0EA]/95 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-3.5 sm:gap-4 sm:px-8 sm:py-4">
        <Link
          href={SPOKEDU_BASE_PATH}
          className={`text-[13px] font-semibold tracking-[0.18em] transition-colors ${
            onHero ? 'text-white' : 'text-stone-950'
          }`}
        >
          {brandProfile.nameEn}
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={`nav-${item.label}`}
              className={`text-[13px] font-medium transition-colors ${
                onHero ? 'text-white/80 hover:text-white' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={`${SPOKEDU_BASE_PATH}/contact`}
          id="header-contact-button"
          data-track="cta-contact"
          data-track-label="header-contact"
          className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition sm:min-h-11 sm:text-[13px] ${
            onHero
              ? 'border border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
              : 'border border-stone-400/50 bg-stone-950 text-white hover:bg-stone-800'
          }`}
        >
          문의하기
        </Link>
      </div>
      <div className={`mx-auto w-full max-w-6xl overflow-x-auto px-5 pb-3 sm:px-8 md:hidden ${onHero ? '' : ''}`}>
        <nav className="flex min-w-max items-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={`mobile-nav-${item.label}`}
              className={`text-sm font-medium transition-colors ${
                onHero ? 'text-white/85 hover:text-white' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const socialLinks = getSocialLinks();

  return (
    <footer className="border-t border-stone-300/60 bg-[#EDE9E3]">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-wide text-stone-950">
              {brandProfile.nameEn}
              <span className="mx-2 font-normal text-stone-400">/</span>
              {brandProfile.nameKo}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-stone-600">{brandProfile.tagline}</p>
          </div>
          <div className="grid gap-1.5 text-sm text-stone-600">
            <p>
              <span className="font-medium text-stone-800">대표</span> {brandProfile.representative}
            </p>
            <p>
              <span className="font-medium text-stone-800">연락처</span>{' '}
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
              <span className="font-medium text-stone-800">이메일</span>{' '}
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

        <nav aria-label="사이트 메뉴" className="border-t border-stone-300/50 pt-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  data-track={inferTrackFromHref(link.href)}
                  data-track-label={`footer-nav-${link.label}`}
                  className="text-xs font-medium text-stone-500 transition hover:text-stone-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {footerSupplementaryLinks.length > 0 ? (
          <nav aria-label="추가 콘텐츠" className="border-t border-stone-300/50 pt-4">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {footerSupplementaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-track={inferTrackFromHref(link.href)}
                    data-track-label={`footer-supplementary-${link.label}`}
                    className="text-xs font-medium text-stone-500 transition hover:text-stone-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {socialLinks.length > 0 ? (
          <div className="border-t border-stone-300/50 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">공식 채널</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {socialLinks.map((channel) => (
                <a
                  key={channel.key}
                  href={channel.href}
                  target="_blank"
                  rel="noreferrer"
                  data-track={`external-${channel.key}`}
                  data-track-label={`footer-${channel.key}`}
                  className="rounded-full border border-stone-300/80 bg-[#F6F4F0] px-3.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
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
