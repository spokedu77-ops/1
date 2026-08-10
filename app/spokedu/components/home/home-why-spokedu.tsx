'use client';

import { homePage } from '../../data/home-page';
import { HOME_MEDIA } from '../../data/home-media';
import { brandBlue, homeBandWhite, homeBody, homePhotoGrade, homeSectionH2, homeSectionPadCompact, homeSectionScrollMt, koreanText, siteContainer } from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeWhySpokedu() {
  return (
    <section id="why-spokedu" className={`${homeSectionScrollMt} ${homeSectionPadCompact} ${homeBandWhite}`} aria-labelledby="home-why-heading">
      <div className={`${siteContainer} grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12`}>
        <div className="relative min-h-[18rem] overflow-hidden rounded-[1.5rem] ring-1 ring-[#DCE3EE] sm:min-h-[22rem]">
          <MediaPanel media={HOME_MEDIA.proofLab} className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`} sizes="card2" objectFit="cover" />
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>WHY SPOKEDU</p>
          <h2 id="home-why-heading" className={`${homeSectionH2} mt-3`}>직접 수업하며 필요한 것을 만듭니다.</h2>
          <p className={`${homeBody} mt-4 max-w-xl ${koreanText}`}>{homePage.pillars.lead}</p>
          <p className={`mt-3 max-w-xl text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>{homePage.pillars.relationLine}</p>
          <TrackedLink href={homePage.pillars.items[0]?.href ?? '/education'} trackLabel="cta-home-why-education" className="mt-6 inline-flex font-semibold text-[#245DFF] underline-offset-4 hover:underline">현장 수업 보기 →</TrackedLink>
        </div>
      </div>
    </section>
  );
}
