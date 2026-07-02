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

        <ul className="mt-8 grid grid-cols-1 gap-5 min-[720px]:mt-10 min-[720px]:grid-cols-2 min-[1180px]:grid-cols-3 min-[1180px]:gap-6">
          {homePage.audienceGate.items.map((item, index) => {
            const media = HOME_MEDIA[item.mediaKey];
            const spanThird = index === 2 ? 'min-[720px]:col-span-2 min-[1180px]:col-span-1' : '';
            return (
              <li key={item.id} className={`min-w-0 ${spanThird}`}>
                <TrackedLink
                  href={item.href}
                  trackLabel={item.trackLabel}
                  className={`${homeGateCard} ${homeFocusRing} block h-full`}
                >
                  <div className="overflow-hidden">
                    <MediaPanel
                      media={media}
                      className={`aspect-[16/10] w-full border-0 rounded-none ${homePhotoGrade}`}
                      sizes="gateCard"
                    />
                  </div>
                  <div className={`flex min-w-0 flex-col ${homeCardPanelPad}`}>
                    <h3 className={homeCardTitle}>{item.title}</h3>
                    <p className={`${homeBody} mt-2 line-clamp-2`}>{item.description}</p>
                    <p className={`mt-3 text-sm text-slate-600 sm:text-[15px] ${koreanText}`}>
                      {item.bullets.join(' · ')}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8] sm:text-base">
                      자세히 보기
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
