import Link from 'next/link';
import { siteNavItems as navItems } from '../data/site';
import {
  brandContactLinks,
  brandProfile,
  footerLinks,
  getSocialLinks,
  SPOKEDU_BASE_PATH,
} from '../data/site';
import { inferTrackFromHref } from '../lib/tracking';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3.5 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link href={SPOKEDU_BASE_PATH} className="text-sm font-semibold tracking-[0.14em] text-slate-900">
          {brandProfile.nameEn}
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={`nav-${item.label}`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
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
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-900 sm:text-sm"
        >
          문의하기
        </Link>
      </div>
      <div className="mx-auto w-full max-w-6xl overflow-x-auto px-3.5 pb-2.5 sm:px-6 md:hidden">
        <nav className="flex min-w-max items-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={`mobile-nav-${item.label}`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
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
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {brandProfile.nameEn} / {brandProfile.nameKo}
            </p>
            <p className="text-sm text-slate-600">{brandProfile.tagline}</p>
          </div>
          <div className="grid gap-1 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-800">대표</span> {brandProfile.representative}
            </p>
            <p>
              <span className="font-semibold text-slate-800">연락처</span>{' '}
              <a
                id="footer-phone-link"
                data-track="cta-phone"
                data-track-label="footer-phone"
                href={brandContactLinks.phone}
                className="underline underline-offset-2"
              >
                {brandProfile.phone}
              </a>
            </p>
            <p>
              <span className="font-semibold text-slate-800">이메일</span>{' '}
              <a
                id="footer-email-link"
                data-track="cta-email"
                data-track-label="footer-email"
                href={brandContactLinks.email}
                className="underline underline-offset-2"
              >
                {brandProfile.email}
              </a>
            </p>
            <p>
              <span className="font-semibold text-slate-800">운영권역</span> {brandProfile.serviceArea}
            </p>
          </div>
        </div>

        <nav aria-label="사이트 메뉴" className="border-t border-slate-100 pt-4">
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  data-track={inferTrackFromHref(link.href)}
                  data-track-label={`footer-nav-${link.label}`}
                  className="text-xs text-slate-500 transition hover:text-slate-800"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {socialLinks.length > 0 ? (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500">공식 채널</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {socialLinks.map((channel) => (
                <a
                  key={channel.key}
                  href={channel.href}
                  target="_blank"
                  rel="noreferrer"
                  data-track={`external-${channel.key}`}
                  data-track-label={`footer-${channel.key}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
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
