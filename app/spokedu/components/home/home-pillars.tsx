'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  brandBlue,
  brandInk,
  homeBandWhite,
  homeFocusRing,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteContainer,
} from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

type PillarItem = (typeof homePage.pillars.items)[number];

function PillarNode({
  item,
  emphasis = false,
}: {
  item: PillarItem;
  emphasis?: boolean;
}) {
  return (
    <TrackedLink
      href={item.href}
      trackLabel={item.trackLabel}
      className={`${homeFocusRing} block h-full rounded-[1.25rem] border px-5 py-5 transition sm:px-6 sm:py-6 ${
        emphasis
          ? 'border-[#245DFF]/35 bg-[#F3F7FF] shadow-[0_14px_36px_rgba(36,93,255,0.08)]'
          : 'border-[#DCE3EE] bg-white'
      }`}
    >
      <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
        {item.badge}
      </p>
      <h3
        className={`mt-1.5 text-lg font-bold tracking-[-0.02em] sm:text-xl ${koreanText}`}
        style={{ color: brandInk }}
      >
        {item.title}
      </h3>
      {'relationNote' in item && item.relationNote ? (
        <p
          className={`mt-2 inline-flex w-fit rounded-full border border-[#D6E3FF] bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#2C446D] ${koreanText}`}
        >
          {item.relationNote}
        </p>
      ) : null}
      <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.role}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${item.title} 포함`}>
        {item.examples.slice(0, 3).map((example) => (
          <li
            key={example}
            className="rounded-full border border-[#E4EAF3] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#2C446D]"
          >
            {example}
          </li>
        ))}
      </ul>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: brandBlue }}>
        {item.ctaLabel}
        <HomeChevron />
      </span>
    </TrackedLink>
  );
}

/** 체육교육 ← SPOMOVE → 구독시스템 — 단일 DOM, 반응형 배치 */
export function HomePillars() {
  const { id, eyebrow, title, lead, relationLine, items } = homePage.pillars;
  const reducedMotion = useReducedMotion();
  const education = items.find((item) => item.id === 'education');
  const spomove = items.find((item) => item.id === 'spomove');
  const curriculum = items.find((item) => item.id === 'curriculum');

  if (!education || !spomove || !curriculum) return null;

  return (
    <section
      id={id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} ${homeBandWhite}`}
      aria-labelledby="home-pillars-heading"
    >
      <div className={siteContainer}>
        <motion.div
          className="max-w-2xl"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>
            {eyebrow}
          </p>
          <h2 id="home-pillars-heading" className={`${homeSectionH2} mt-3`}>
            {title}
          </h2>
          <p className={`mt-3 max-w-xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {lead}
          </p>
        </motion.div>

        <motion.div
          className="mt-8 lg:mt-10"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex flex-col items-stretch gap-0 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.05fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-3 xl:gap-4">
            <div className="min-w-0">
              <PillarNode item={education} />
            </div>

            <div
              className="flex flex-col items-center justify-center gap-1 py-2 text-[#9BB0D4] lg:px-1 lg:py-0"
              aria-hidden
            >
              <p className={`text-[11px] font-semibold text-[#6D7B90] ${koreanText}`}>
                <span className="lg:hidden">현장 적용</span>
                <span className="hidden lg:inline">현장</span>
              </p>
              {/* mobile: down arrow / desktop: left-pointing (education ← spomove) */}
              <svg
                width="16"
                height="22"
                viewBox="0 0 16 22"
                fill="none"
                className="opacity-80 lg:hidden"
              >
                <path d="M8 0v16" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M3 12l5 6 5-6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinejoin="round"
                />
              </svg>
              <svg
                width="28"
                height="16"
                viewBox="0 0 28 16"
                fill="none"
                className="hidden opacity-80 lg:block"
              >
                <path d="M28 8H6" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10 3L4 8l6 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <PillarNode item={spomove} emphasis />
            </div>

            <div
              className="flex flex-col items-center justify-center gap-1 py-2 text-[#9BB0D4] lg:px-1 lg:py-0"
              aria-hidden
            >
              <p className={`text-[11px] font-semibold text-[#6D7B90] ${koreanText}`}>
                <span className="lg:hidden">지도자 활용</span>
                <span className="hidden lg:inline">구독</span>
              </p>
              <svg
                width="16"
                height="22"
                viewBox="0 0 16 22"
                fill="none"
                className="opacity-80 lg:hidden"
              >
                <path d="M8 0v16" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M3 12l5 6 5-6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinejoin="round"
                />
              </svg>
              <svg
                width="28"
                height="16"
                viewBox="0 0 28 16"
                fill="none"
                className="hidden opacity-80 lg:block"
              >
                <path d="M0 8h22" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M18 3l6 5-6 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <PillarNode item={curriculum} />
            </div>
          </div>
        </motion.div>

        <p className="sr-only">{relationLine}</p>
      </div>
    </section>
  );
}
