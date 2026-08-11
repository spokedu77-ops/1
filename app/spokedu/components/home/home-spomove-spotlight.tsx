'use client';

import { homePage } from '../../data/home-page';
import { HOME_MEDIA } from '../../data/home-media';
import { homeFocusRing, homePhotoGrade, homeSectionH2, homeSectionPadCompact, homeSectionScrollMt, koreanText, siteBtnPrimary, siteContainer } from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeSpomoveSpotlight() {
  const { title, titleLine2, lead, flowSteps, primaryCta } = homePage.spomove;
  return (
    <section id={homePage.spomove.id} className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-[#0B1F46] text-white`} aria-labelledby="home-spomove-heading">
      <div className={`${siteContainer} grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-16`}>
        <div className="relative min-h-[15rem] overflow-hidden rounded-[1.5rem] ring-1 ring-[#DCE3EE] sm:min-h-[19rem] lg:min-h-[21rem]">
          <MediaPanel media={HOME_MEDIA[homePage.spomove.mediaKey]} className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`} sizes="card2" objectFit="cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-[#0B1F46]/70 to-transparent p-5 pt-16"><div className="h-1.5 w-40 rounded-full bg-gradient-to-r from-[#4BD36B] via-[#F23B61] to-[#F6C744]" aria-hidden /></div>
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#9FC0FF]">SPOMOVE</p>
          <h2 id="home-spomove-heading" className={`${homeSectionH2} mt-3`}>{title}<span className="mt-1 block text-[0.88em] text-[#37455C]">{titleLine2}</span></h2>
          <p className={`mt-4 text-base leading-[1.7] text-[#CFDAEA] sm:text-[17px] ${koreanText}`}>{lead}</p>
          <ol className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="SPOMOVE 흐름">
            {flowSteps.slice(0, 3).map((step, index) => <li key={step.label} className="border-l-2 border-[#245DFF] px-3 py-2"><span className="text-xs font-bold text-[#245DFF]">0{index + 1}</span><strong className={`mt-1 block text-base text-[#14213A] ${koreanText}`}>{step.label}</strong><span className={`mt-1 block text-xs text-[#6D7B90] ${koreanText}`}>{step.hint}</span></li>)}
          </ol>
          <TrackedLink href={primaryCta.href} trackLabel={primaryCta.trackLabel} className={`${siteBtnPrimary} ${homeFocusRing} mt-7`}>{primaryCta.label}</TrackedLink>
        </div>
      </div>
    </section>
  );
}
