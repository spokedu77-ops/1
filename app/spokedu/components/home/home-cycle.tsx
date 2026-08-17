'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeBandNavy,
  homeBody,
  homePhotoGrade,
  marketingSectionDisplay,
  marketingSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  marketingSectionInner,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';

/** 현장 → 콘텐츠 → 시스템 — 4단계만으로 완결 (하단 pill rail 없음) */
export function HomeCycle() {
  const { id, title, lead, processLabel, steps } = homePage.cycle;
  const reducedMotion = useReducedMotion();
  const media = HOME_MEDIA.proofLab;

  return (
    <section
      id={id}
      className={`${homeSectionScrollMt} ${marketingSectionPadCompact} ${homeBandNavy}`}
      aria-labelledby="home-cycle-heading"
    >
      <div className={marketingSectionInner}>
        <motion.div
          className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-stretch lg:gap-12"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative min-h-[14rem] overflow-hidden rounded-[1.5rem] ring-1 ring-white/12 sm:min-h-[18rem] lg:min-h-full">
            <MediaPanel
              media={media}
              className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`}
              sizes="card2"
              objectFit="cover"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1F46]/55 via-transparent to-transparent"
              aria-hidden
            />
            <p className="absolute bottom-4 left-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9FC0FF]">
              {processLabel}
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#9FC0FF]">순환</p>
            <h2 id="home-cycle-heading" className={`${marketingSectionDisplay} mt-3 text-white`}>
              {title}
            </h2>
            <p className={`${homeBody} mt-4 text-[#CFDAEA]`}>{lead}</p>

            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {steps.map((step, index) => (
                <li
                  key={step.label}
                  className={`rounded-[1.15rem] border border-white/12 bg-white/[0.06] px-4 py-4 text-sm font-semibold leading-snug text-[#E8EEF7] sm:px-5 sm:text-[15px] ${koreanText}`}
                >
                  <span className="mb-2 block text-[11px] font-bold tracking-[0.14em] text-[#9FC0FF]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="block text-base font-bold text-white">{step.label}</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-[#B8C8E0]">{step.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
