'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { aboutPage } from '../data/about-page';
import { HOME_MEDIA } from '../data/home-media';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  homeBandWhite,
  homeBodyLead,
  homeFocusRing,
  homeSectionEyebrow,
  marketingSectionDisplay,
  homeSectionPadCompact,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../lib/ui-classes';
import { MediaPanel } from './visual';
import { TrackedLink } from './home/tracked-link';
import { HomeChevron } from './home/home-chevron';

/** About — 6섹션 조직 소개 (영업 랜딩 아님) */
export function AboutLanding() {
  const reducedMotion = useReducedMotion();
  const { intro, origin, whatWeDo, principles, history, team, nextPaths } = aboutPage;

  return (
    <main className="w-full overflow-x-clip" data-spokedu-about-sections={aboutPage.sectionOrder.length}>
      <section id={intro.id} className={`${homeSectionPadCompact} bg-white`}>
        <div className={siteContainer}>
          <motion.div
            className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="max-w-2xl">
              <p className={homeSectionEyebrow}>{intro.eyebrow}</p>
              <h1 className={`${marketingSectionDisplay} mt-3`}>{intro.title}</h1>
              <p className={`${homeBodyLead} mt-4`}>{intro.lead}</p>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-stone-200/80">
              <MediaPanel
                media={HOME_MEDIA[intro.mediaKey]}
                className="absolute inset-0 h-full w-full border-0 rounded-none"
                sizes="hero"
                photoPriority
                objectFit="cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section id={origin.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{origin.eyebrow}</p>
          <h2 className={`${marketingSectionDisplay} mt-3`}>{origin.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>{origin.lead}</p>
          <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {origin.steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-[#D6E3FF] bg-white px-5 py-5">
                <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                  {index + 1}
                </p>
                <h3 className={`mt-2 text-base font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {step.title}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id={whatWeDo.id} className={`${homeSectionPadCompact} ${homeBandWhite}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{whatWeDo.eyebrow}</p>
          <h2 className={`${marketingSectionDisplay} mt-3`}>{whatWeDo.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>{whatWeDo.lead}</p>
          <ul className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {whatWeDo.items.map((item) => (
              <li key={item.id} className="flex h-full flex-col rounded-2xl border border-stone-200/80 bg-stone-50/70 px-5 py-5">
                <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                  {item.role}
                </p>
                <h3 className={`mt-2 text-lg font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {item.title}
                </h3>
                <p className={`mt-2 flex-1 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.body}</p>
                <TrackedLink
                  href={item.href}
                  trackLabel={item.trackLabel}
                  className={`${siteBtnSecondary} mt-5 h-11 ${homeFocusRing}`}
                >
                  {item.ctaLabel}
                  <HomeChevron />
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={principles.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{principles.eyebrow}</p>
          <h2 className={`${marketingSectionDisplay} mt-3`}>{principles.title}</h2>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {principles.items.map((item) => (
              <li key={item.title} className="rounded-2xl border border-[#D6E3FF] bg-white px-5 py-5">
                <h3 className={`text-base font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {item.title}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={history.id} className={`${homeSectionPadCompact} ${homeBandWhite}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{history.eyebrow}</p>
          <h2 className={`${marketingSectionDisplay} mt-3`}>{history.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>{history.lead}</p>
          <ol className="mt-8 space-y-3">
            {history.milestones.map((item) => (
              <li
                key={`${item.date}-${item.text}`}
                className="grid gap-1 rounded-xl border border-stone-200/80 bg-white px-4 py-3 sm:grid-cols-[7rem_1fr] sm:gap-4"
              >
                <p className="text-xs font-bold text-[#245DFF] sm:pt-0.5">{item.date}</p>
                <p className={`text-sm leading-relaxed text-slate-700 ${koreanText}`}>{item.text}</p>
              </li>
            ))}
          </ol>

          <div id={team.id} className="mt-10 rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-5">
            <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
              {team.eyebrow}
            </p>
            <h3 className={`mt-2 text-lg font-bold ${koreanText}`} style={{ color: brandInk }}>
              {team.title}: {team.name}
            </h3>
            <p className={`mt-1 text-sm text-[#536279] ${koreanText}`}>{team.role}</p>
            <ul className="mt-3 space-y-1">
              {team.notes.map((note) => (
                <li key={note} className={`text-sm text-[#536279] ${koreanText}`}>
                  · {note}
                </li>
              ))}
            </ul>
            <p className={`mt-3 text-xs leading-relaxed text-stone-500 ${koreanText}`}>{team.note}</p>
          </div>
        </div>
      </section>

      <section id={nextPaths.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{nextPaths.eyebrow}</p>
          <h2 className={`${marketingSectionDisplay} mt-3`}>{nextPaths.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>{nextPaths.lead}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {nextPaths.items.map((item, index) => (
              <TrackedLink
                key={item.href}
                href={item.href}
                trackLabel={item.trackLabel}
                className={`${index === 0 ? siteBtnPrimary : siteBtnSecondary} h-12 px-6 ${homeFocusRing}`}
              >
                {item.label}
              </TrackedLink>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {nextPaths.secondary.map((item) => (
              <TrackedLink
                key={item.href}
                href={item.href}
                trackLabel={item.trackLabel}
                className={`text-sm font-semibold text-[#245DFF] underline-offset-2 hover:underline ${homeFocusRing}`}
              >
                {item.label}
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
