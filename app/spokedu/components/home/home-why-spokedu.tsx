'use client';

import { homePage } from '../../data/home-page';
import { HOME_MEDIA } from '../../data/home-media';
import { brandBlue, homeBandWhite, homeBody, homePhotoGrade, homeSectionH2, homeSectionPadCompact, homeSectionScrollMt, koreanText, siteContainer } from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeWhySpokedu() {
  return (
    <section id="why-spokedu" className={`${homeSectionScrollMt} ${homeSectionPadCompact} ${homeBandWhite}`} aria-labelledby="home-why-heading">
      <div className={`${siteContainer} grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16`}>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>WHY SPOKEDU</p>
          <h2 id="home-why-heading" className={`${homeSectionH2} mt-3`}>{homePage.whySpokedu.title}</h2>
          <p className={`${homeBody} mt-4 max-w-xl ${koreanText}`}>{homePage.whySpokedu.body}</p>
          <TrackedLink href={homePage.whySpokedu.cta.href} trackLabel={homePage.whySpokedu.cta.trackLabel} className="mt-6 inline-flex font-semibold text-[#245DFF] underline-offset-4 hover:underline">{homePage.whySpokedu.cta.label} →</TrackedLink>
        </div>
        <div className="relative min-h-[14rem] overflow-hidden rounded-[1.5rem] ring-1 ring-[#DCE3EE] sm:min-h-[18rem] lg:min-h-[20rem]">
          <MediaPanel media={HOME_MEDIA.proofClass} className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`} sizes="card2" objectFit="cover" />
        </div>
      </div>
    </section>
  );
}
