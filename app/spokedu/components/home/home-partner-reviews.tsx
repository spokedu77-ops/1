'use client';

import { dispatchPage } from '../../data/dispatch-page';
import { SPOKEDU_BASE_PATH } from '../../data/site';
import {
  homeFocusRing,
  homeSectionH2,
  homeSectionPadCompact,
  koreanText,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';

const HOME_REVIEW_ITEMS = dispatchPage.partnerReviews.items.slice(0, 2);

export function HomePartnerReviews() {
  return (
    <section className={`${homeSectionPadCompact} bg-[#FAFAF8]`} aria-labelledby="home-partner-reviews-heading">
      <div className={siteContainer}>
        <div className="grid gap-6 min-[1040px]:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] min-[1040px]:items-start min-[1040px]:gap-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1D4ED8]">{dispatchPage.partnerReviews.eyebrow}</p>
            <h2 id="home-partner-reviews-heading" className={`${homeSectionH2} mt-3`}>
              맡겨본 기관의 말이 더 빠릅니다.
            </h2>
            <p className={`mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-[17px] ${koreanText}`}>
              공간, 인원, 대상이 달라도 수업 흐름이 무너지지 않도록 운영한 경험이 쌓여 있습니다.
            </p>
            <TrackedLink
              href={`${SPOKEDU_BASE_PATH}/dispatch`}
              trackLabel="cta-home-review-dispatch"
              className={`${siteBtnSecondary} mt-6 ${homeFocusRing}`}
            >
              기관 출강 자세히 보기
            </TrackedLink>
          </div>

          <div className="grid gap-4 min-[720px]:grid-cols-2">
            {HOME_REVIEW_ITEMS.map((item) => (
              <article key={item.quote} className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6">
                <p className={`text-lg font-bold leading-snug text-[#0B1220] ${koreanText}`}>
                  &ldquo;{item.quote}&rdquo;
                </p>
                <p className={`mt-4 line-clamp-5 text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
                  {item.body}
                </p>
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className={`text-sm font-bold text-slate-800 ${koreanText}`}>{item.name}</p>
                  <p className={`mt-1 text-sm text-slate-500 ${koreanText}`}>{item.org}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
