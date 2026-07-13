'use client';

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
  return (
    <section id={homePage.audienceGate.id} className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-[#FAFAF8]`}>
      <div className={siteContainer}>
        <h2 className={homeSectionH2}>{homePage.audienceGate.title}</h2>
        <p className={`${homeBody} mt-4 max-w-3xl`}>{homePage.audienceGate.lead}</p>

        <ul className="mt-8 grid grid-cols-1 gap-5 min-[720px]:mt-10 min-[720px]:grid-cols-2 min-[1180px]:grid-cols-3 min-[1180px]:gap-6">
          {homePage.audienceGate.items.map((item, index) => {
            const media = HOME_MEDIA[item.mediaKey];
            const spanThird = index === 2 ? 'min-[720px]:col-span-2 min-[1180px]:col-span-1' : '';
            const accentClass = ['bg-[#1D4ED8]', 'bg-[#10B981]', 'bg-[#F59E0B]'][index] ?? 'bg-[#1D4ED8]';
            return (
              <li key={item.id} className={`min-w-0 ${spanThird}`}>
                <TrackedLink
                  href={item.href}
                  trackLabel={item.trackLabel}
                  className={`${homeGateCard} ${homeFocusRing} block h-full`}
                >
                  <span className={`block h-1.5 w-full ${accentClass}`} aria-hidden />
                  <div className="overflow-hidden">
                    <MediaPanel
                      media={media}
                      className={`aspect-[16/7] w-full border-0 rounded-none sm:aspect-[16/10] ${homePhotoGrade}`}
                      sizes="gateCard"
                    />
                  </div>
                  <div className={`flex min-w-0 flex-col ${homeCardPanelPad}`}>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1D4ED8]">{item.badge}</p>
                    <h3 className={homeCardTitle}>{item.title}</h3>
                    <p className={`${homeBody} mt-2`}>{item.description}</p>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">이럴 때</p>
                      <p className={`mt-1.5 text-sm leading-relaxed text-slate-700 ${koreanText}`}>{item.fit}</p>
                    </div>
                    <ul className="mt-3 hidden flex-wrap gap-2 sm:flex">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8] sm:text-base">
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
