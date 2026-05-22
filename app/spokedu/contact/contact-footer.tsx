import Link from 'next/link';
import { navItems } from '../data/content';
import { brandContactLinks, brandProfile, SPOKEDU_BASE_PATH } from '../data/site';
import { contactPageContent } from './contact-page-data';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

export function ContactPageFooter() {
  const nav = navItems.filter((item) =>
    contactPageContent.footer.navLabels.includes(item.label as (typeof contactPageContent.footer.navLabels)[number]),
  );

  return (
    <footer className="mt-10 border-t border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white">
      <div className="mx-auto w-full max-w-6xl px-3.5 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="max-w-sm space-y-2">
            <p className="text-base font-bold tracking-tight text-slate-950">
              {brandProfile.nameEn} / {brandProfile.nameKo}
            </p>
            <p className="text-sm leading-relaxed text-slate-600">{contactPageContent.footer.tagline}</p>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">대표</span>{' '}
              <span className="text-slate-800">{brandProfile.representative}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-900">전화</span>{' '}
              <a
                href={brandContactLinks.phone}
                data-track="cta-phone"
                data-track-label="contact-footer-phone"
                className={`font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
              >
                {brandProfile.phone}
              </a>
            </p>
            <p>
              <span className="font-semibold text-slate-900">이메일</span>{' '}
              <a
                href={brandContactLinks.email}
                data-track="cta-email"
                data-track-label="contact-footer-email"
                className={`break-all font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
              >
                {brandProfile.email}
              </a>
            </p>
            <p>
              <span className="font-semibold text-slate-900">운영지역</span>{' '}
              <span className="text-slate-800">{brandProfile.serviceArea}</span>
            </p>
          </div>
        </div>
        <nav aria-label="사이트 메뉴" className="mt-8 border-t border-slate-200/80 pt-6">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {nav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  data-track={inferTrackFromHref(link.href)}
                  data-track-label={`contact-footer-nav-${link.label}`}
                  className={`text-sm font-medium text-slate-600 hover:text-indigo-700 ${focusRing}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-6 text-xs text-slate-500">
          <Link href={SPOKEDU_BASE_PATH} className={`font-medium hover:text-slate-700 ${focusRing}`}>
            {brandProfile.nameEn} 홈
          </Link>
        </p>
      </div>
    </footer>
  );
}
