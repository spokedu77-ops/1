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
    <section className={`${homeSectionPadCompact} bg-white`} aria-labelledby="home-partner-reviews-heading">
      <div className={siteContainer}>
        <motion.div
          className="max-w-2xl"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">
            {dispatchPage.partnerReviews.eyebrow}
          </p>
          <h2 id="home-partner-reviews-heading" className={`${homeSectionH2} mt-3`}>
            맡겨본 기관의 말이 더 빠릅니다.
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-5 min-[800px]:grid-cols-2 min-[800px]:gap-6">
          {HOME_REVIEW_ITEMS.map((item, index) => (
            <motion.article
              key={item.quote}
              className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-[#F3F7FC] px-5 py-6 sm:px-7 sm:py-8"
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <span className="pointer-events-none absolute -right-2 -top-4 text-[7rem] font-black leading-none text-[#1D4ED8]/10" aria-hidden>
                “
              </span>
              <p className={`relative text-xl font-bold leading-snug text-[#0B1220] sm:text-2xl ${koreanText}`}>
                {item.quote}
              </p>
              <p className={`relative mt-4 text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
                {item.body}
              </p>
              <div className="relative mt-6 border-t border-slate-200/90 pt-4">
                <p className={`text-sm font-bold text-slate-800 ${koreanText}`}>{item.name}</p>
                <p className={`mt-1 text-sm text-slate-500 ${koreanText}`}>{item.org}</p>
              </div>
            </motion.article>
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
