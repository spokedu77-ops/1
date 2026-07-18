'use client';

import { motion, useReducedMotion } from 'framer-motion';
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
  const reducedMotion = useReducedMotion();

  return (
    <section className={`${homeSectionPadCompact} bg-[#FAFAF8]`} aria-labelledby="home-partner-reviews-heading">
      <div className={siteContainer}>
        <motion.div
          className="max-w-xl"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-sm font-semibold text-[#1D4ED8]">{dispatchPage.partnerReviews.eyebrow}</p>
          <h2 id="home-partner-reviews-heading" className={`${homeSectionH2} mt-3`}>
            맡겨본 기관의 말이 더 빠릅니다.
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-6 min-[800px]:grid-cols-2">
          {HOME_REVIEW_ITEMS.map((item) => (
            <article
              key={item.quote}
              className="min-w-0 border-t border-slate-300 pt-6"
            >
              <p className={`text-xl font-bold leading-snug text-[#0B1220] sm:text-2xl ${koreanText}`}>
                &ldquo;{item.quote}&rdquo;
              </p>
              <p className={`mt-4 text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
                {item.body}
              </p>
              <div className="mt-6">
                <p className={`text-sm font-bold text-slate-800 ${koreanText}`}>{item.name}</p>
                <p className={`mt-1 text-sm text-slate-500 ${koreanText}`}>{item.org}</p>
              </div>
            </article>
          ))}
        </div>

        <TrackedLink
          href={`${SPOKEDU_BASE_PATH}/dispatch`}
          trackLabel="cta-home-review-dispatch"
          className={`${siteBtnSecondary} mt-10 ${homeFocusRing}`}
        >
          기관 프로그램 자세히 보기
        </TrackedLink>
      </div>
    </section>
  );
}
