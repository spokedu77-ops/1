'use client';

import { brandContactLinks, brandProfile } from '../data/site';
import { contactPageContent } from './contact-page-data';
import { marketingButtonPrimary } from '../lib/ui-classes';
import { externalLinkProps } from '../lib/external-link';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]';

type ContactFallbackProps = {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ContactFallback({
  title,
  description,
  onRetry,
  retryLabel = '다시 시도',
}: ContactFallbackProps) {
  const kakaoHref = contactPageContent.kakaoChannelHref;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-base font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{description}</p>
      <dl className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">전화</dt>
          <dd className="mt-1.5">
            <a
              href={brandContactLinks.phone}
              data-track="cta-phone"
              data-track-label={contactPageContent.contactTracks.phone}
              className={`text-base font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
            >
              {brandProfile.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">이메일</dt>
          <dd className="mt-1.5 break-all">
            <a
              href={brandContactLinks.email}
              data-track="cta-email"
              data-track-label={contactPageContent.contactTracks.email}
              className={`text-base font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
            >
              {brandProfile.email}
            </a>
          </dd>
        </div>
        {kakaoHref ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">카카오채널</dt>
            <dd className="mt-1.5">
              <a
                href={kakaoHref}
                {...externalLinkProps}
                data-track="cta-kakao"
                data-track-label={contactPageContent.contactTracks.kakao}
                className={`text-base font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
              >
                카카오채널로 문의
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={`${marketingButtonPrimary} mt-5`}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
