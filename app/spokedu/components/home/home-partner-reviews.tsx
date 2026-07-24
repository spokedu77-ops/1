'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { dispatchPage } from '../../data/dispatch-page';
import { SPOKEDU_BASE_PATH } from '../../data/site';
import {
  brandBlue,
  brandInk,
  homeFocusRing,
  homeSectionH2,
  homeSectionPadCompact,
  koreanText,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';

const HOME_REVIEW_ITEMS = dispatchPage.partnerReviews.items;

export function HomePartnerReviews() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className={`${homeSectionPadCompact} bg-[#F5F7FB]`}
      aria-labelledby="home-partner-reviews-heading"
    >
      <div className={siteContainer}>
        <motion.div
          className="max-w-2xl"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
        >
          <p
            className="text-[12px] font-bold uppercase tracking-[0.14em]"
            style={{ color: brandBlue }}
          >
            {dispatchPage.partnerReviews.eyebrow}
          </p>
          <h2 id="home-partner-reviews-heading" className={`${homeSectionH2} mt-3`}>
            {dispatchPage.partnerReviews.title}
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {HOME_REVIEW_ITEMS.map((item, index) => (
            <motion.article
              key={item.quote}
              className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#DCE3EE] bg-white px-5 py-6 shadow-[0_12px_32px_rgba(15,33,70,0.04)] sm:px-6 sm:py-7"
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <span
                className="pointer-events-none absolute -right-2 -top-4 text-[7rem] font-black leading-none text-[#245DFF]/12"
                aria-hidden
              >
                “
              </span>
              <p
                className={`relative text-lg font-bold leading-snug tracking-[-0.02em] sm:text-xl ${koreanText}`}
                style={{ color: brandInk }}
              >
                {item.quote}
              </p>
              <p className={`relative mt-3 text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                {item.body}
              </p>
              <div className="relative mt-5 border-t border-[#DCE3EE] pt-4">
                <p className={`text-sm font-bold text-[#14213A] ${koreanText}`}>{item.name}</p>
                <p className={`mt-1 text-sm text-[#6D7B90] ${koreanText}`}>{item.org}</p>
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
