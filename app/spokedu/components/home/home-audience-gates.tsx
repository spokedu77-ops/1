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
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} border-b border-slate-200/90 bg-white`}
    >
      <div className={siteContainer}>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
        >
          <h2 className={homeSectionH2}>{homePage.audienceGate.title}</h2>
          <p className={`${homeBody} mt-4 max-w-2xl`}>{homePage.audienceGate.lead}</p>
        </motion.div>

        <ul className="mt-8 grid grid-cols-1 gap-5 min-[900px]:grid-cols-3 min-[900px]:gap-6">
          {homePage.audienceGate.items.map((item, index) => {
            const media = HOME_MEDIA[item.mediaKey];
            return (
              <li key={item.id} className="min-w-0">
                <TrackedLink
                  href={item.href}
                  trackLabel={item.trackLabel}
                  className={`${homeGateCard} ${homeFocusRing} block h-full`}
                >
                  <div className="overflow-hidden">
                    <MediaPanel
                      media={media}
                      className={`aspect-[4/3] w-full border-0 rounded-none ${homePhotoGrade}`}
                      sizes="gateCard"
                      photoPriority={index === 0}
                    />
                  </div>
                  <div className={`flex min-w-0 flex-col ${homeCardPanelPad}`}>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1D4ED8]">{item.badge}</p>
                    <h3 className={`${homeCardTitle} mt-2`}>{item.title}</h3>
                    <p className={`${homeBody} mt-2 line-clamp-3`}>{item.description}</p>
                    <p className={`mt-4 text-sm leading-relaxed text-slate-600 ${koreanText}`}>
                      <span className="font-semibold text-slate-800">이럴 때 · </span>
                      {item.fit}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8]">
                      {item.ctaLabel}
                      <HomeChevron />
                    </span>
                  </div>
                </TrackedLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
