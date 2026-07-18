'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeBody,
  homeCardPanelPad,
  homeCardTitle,
  homeFocusRing,
  homeGateCard,
  homePhotoGrade,
  homeSectionPadCompact,
  homeSectionH2,
  homeSectionScrollMt,
  koreanText,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

export function HomeAudienceGates() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.audienceGate.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-[#F3F7FC]`}
    >
      <div className={siteContainer}>
        <motion.div
          className="max-w-2xl"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">어디로 갈까요</p>
          <h2 className={`${homeSectionH2} mt-3`}>{homePage.audienceGate.title}</h2>
          <p className={`${homeBody} mt-4`}>{homePage.audienceGate.lead}</p>
        </motion.div>

        <ul className="mt-10 grid grid-cols-1 gap-5 min-[900px]:grid-cols-3 min-[900px]:gap-5">
          {homePage.audienceGate.items.map((item, index) => {
            const media = HOME_MEDIA[item.mediaKey];
            return (
              <motion.li
                key={item.id}
                className="min-w-0"
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
              >
                <TrackedLink
                  href={item.href}
                  trackLabel={item.trackLabel}
                  className={`${homeGateCard} ${homeFocusRing} block h-full`}
                >
                  <div className="relative overflow-hidden">
                    <MediaPanel
                      media={media}
                      className={`aspect-[5/4] w-full border-0 rounded-none transition duration-500 ${homePhotoGrade} [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04]`}
                      sizes="gateCard"
                      photoPriority={index === 0}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1220]/35 via-transparent to-transparent"
                      aria-hidden
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold tracking-wide text-[#1D4ED8] shadow-sm backdrop-blur">
                      {item.badge}
                    </span>
                  </div>
                  <div className={`flex min-w-0 flex-1 flex-col ${homeCardPanelPad}`}>
                    <h3 className={homeCardTitle}>{item.title}</h3>
                    <p className={`${homeBody} mt-2 line-clamp-3`}>{item.description}</p>
                    <p className={`mt-4 text-sm leading-relaxed text-slate-500 ${koreanText}`}>
                      <span className="font-semibold text-slate-700">이럴 때 · </span>
                      {item.fit}
                    </p>
                    <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8]">
                      {item.ctaLabel}
                      <HomeChevron />
                    </span>
                  </div>
                </TrackedLink>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
