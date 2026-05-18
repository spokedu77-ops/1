import Link from 'next/link';
import { navItems, SPOKEDU_BASE_PATH } from '../data/content';
import { externalChannels } from '../data/external-channels';
import { brandContactLinks, brandProfile } from '../data/brand';
import { inferTrackFromHref } from '../lib/tracking';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
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
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-900 sm:text-sm"
        >
          문의하기
        </Link>
      </div>
      <div className="mx-auto w-full max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6 md:hidden">
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
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">{brandProfile.nameEn} / {brandProfile.nameKo}</p>
          <p className="text-sm text-slate-600">아동·청소년 체육교육 전문 운영 단체</p>
          <p className="text-sm text-slate-600">현장 수업 운영 · 기관 파견 프로그램 · 커리큘럼/강사교육</p>
        </div>
        <div className="grid gap-1 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">대표</span>
            {' '}
            {brandProfile.representative}
          </p>
          <p>
            <span className="font-semibold text-slate-800">연락처</span>
            {' '}
            <a id="footer-phone-link" data-track="cta-phone" data-track-label="footer-phone" href={brandContactLinks.phone} className="underline underline-offset-2">
              {brandProfile.phone}
            </a>
          </p>
          <p>
            <span className="font-semibold text-slate-800">이메일</span>
            {' '}
            <a id="footer-email-link" data-track="cta-email" data-track-label="footer-email" href={brandContactLinks.email} className="underline underline-offset-2">
              {brandProfile.email}
            </a>
          </p>
          <p>
            <span className="font-semibold text-slate-800">주소</span>
            {' '}
            {brandProfile.address}
          </p>
          <p>
            <span className="font-semibold text-slate-800">사업자 정보</span>
            {' '}
            {brandProfile.businessInfo.displayText}
          </p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">External Channels</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {externalChannels.map((channel) => (
              <a
                key={channel.key}
                href={channel.href}
                target="_blank"
                rel="noreferrer"
                data-track={`external-${channel.key}`}
                data-track-label={`footer-${channel.key}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                <span className="block font-semibold text-slate-900">
                  {channel.label}
                  {channel.isPending ? ' (TODO)' : ''}
                </span>
                <span className="mt-1 block text-xs text-slate-500">{channel.description}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
