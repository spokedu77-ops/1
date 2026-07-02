'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeBody,
  homeCardTitle,
  homeFocusRing,
  homeGateCard,
  homePhotoGrade,
  homeSectionPadCompact,
  homeSectionH2,
  koreanLineBreak,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

export function HomeAudienceGates() {
  return (
    <section id={homePage.audienceGate.id} className={`${homeSectionPadCompact} bg-[#FAFAF8]`}>
      <div className={siteContainer}>
        <h2 className={homeSectionH2}>{homePage.audienceGate.title}</h2>

        <ul className="mt-8 grid gap-5 sm:mt-10 lg:grid-cols-3 lg:gap-6">
          {homePage.audienceGate.items.map((item) => {
            const media = HOME_MEDIA[item.mediaKey];
            return (
              <li key={item.id}>
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
                  <div className="flex flex-col px-5 py-5 sm:px-6 sm:py-6">
                    <h3 className={homeCardTitle}>{item.title}</h3>
                    <p className={`${homeBody} mt-2 line-clamp-2`}>{item.description}</p>
                    <p className={`mt-3 text-sm text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
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
