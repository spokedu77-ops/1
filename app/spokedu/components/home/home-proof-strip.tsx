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

/** SPOKEDU System — 현장 경험이 교육 기준으로 확장되는 과정 */
export function HomeProofStrip() {
  const { title, lead, items, processLabel, processLine } = homePage.proofStrip;
  const processSteps = processLine.split(/\s*→\s*/).filter(Boolean);
  const reducedMotion = useReducedMotion();
  const media = HOME_MEDIA.proofLab;

  return (
    <section
      id={homePage.proofStrip.id}
      className={`${homeSectionScrollMt} ${marketingSectionPadCompact} ${homeBandNavy}`}
      aria-labelledby="home-proof-heading"
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
              FIELD → SYSTEM
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#9FC0FF]">SPOKEDU SYSTEM</p>
            <h2 id="home-proof-heading" className={`${marketingSectionDisplay} mt-3 text-white`}>
              {title}
            </h2>
            <p className={`${homeBody} mt-4 text-[#CFDAEA]`}>{lead}</p>

            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((item, index) => (
                <li
                  key={item}
                  className={`rounded-[1.15rem] border border-white/12 bg-white/[0.06] px-4 py-4 text-sm font-semibold leading-snug text-[#E8EEF7] sm:px-5 sm:text-[15px] ${koreanText}`}
                >
                  <span className="mb-2 block text-[11px] font-bold tracking-[0.14em] text-[#9FC0FF]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="block text-base font-bold text-white">{item}</span>
                  <span className="mt-1 block text-xs font-medium leading-relaxed text-[#B8C8E0]">
                    {index === 0
                      ? '아이와 기관을 만나는 실제 수업'
                      : index === 1
                        ? '대상·공간·목적에 맞춘 과정'
                        : index === 2
                          ? '정규·개인·행사 현장 운영'
                          : 'SPOMOVE·수업안·지도자 교육'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <div className="mt-10 border-t border-white/12 pt-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">{processLabel}</p>
          <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-3">
            {processSteps.map((step, index) => (
              <li key={step} className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0B1F46] shadow-[0_10px_24px_rgba(0,0,0,0.12)] ${koreanText}`}
                >
                  {step}
                </span>
                {index < processSteps.length - 1 ? (
                  <span className="hidden text-white/30 sm:inline" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
