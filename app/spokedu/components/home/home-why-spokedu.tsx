'use client';

import { homePage } from '../../data/home-page';
import { brandBlue, homeBandWhite, homeBody, homeSectionH2, homeSectionPadCompact, homeSectionScrollMt, koreanText, siteContainer } from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';

export function HomeWhySpokedu() {
  return (
    <section id="why-spokedu" className={`${homeSectionScrollMt} ${homeSectionPadCompact} ${homeBandWhite}`} aria-labelledby="home-why-heading">
      <div className={`${siteContainer} max-w-[920px]`}>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>WHY SPOKEDU</p>
          <h2 id="home-why-heading" className={`${homeSectionH2} mt-3`}>{homePage.whySpokedu.title}</h2>
          <p className={`${homeBody} mt-4 max-w-xl ${koreanText}`}>{homePage.whySpokedu.body}</p>
          <TrackedLink href={homePage.whySpokedu.cta.href} trackLabel={homePage.whySpokedu.cta.trackLabel} className="mt-6 inline-flex font-semibold text-[#245DFF] underline-offset-4 hover:underline">{homePage.whySpokedu.cta.label} →</TrackedLink>
        </div>
      </div>
    </section>
  );
}
