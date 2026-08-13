'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homePhotoGrade,
  homeSectionScrollMt,
  marketingBandNavy,
  marketingButtonPrimaryOnDark,
  marketingButtonSecondaryOnDark,
  marketingEyebrowOnDark,
  marketingMediaFrame,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionPad,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeSpomoveSpotlight() {
  const section = homePage.spomove;
  return (
    <section id={section.id} className={`${homeSectionScrollMt} ${marketingBandNavy} ${marketingSectionPad}`} aria-labelledby="home-spomove-heading">
      <div className={`${marketingSectionInner} grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-16`}>
        <div>
          <p className={marketingEyebrowOnDark}>SPOMOVE</p>
          <h2 id="home-spomove-heading" className={`${marketingSectionDisplay} mt-3 text-white`}>
            {section.title}<span className="mt-1 block text-[#AFC8FF]">{section.titleLine2}</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-[1.75] text-[#CFDAEA] sm:text-[17px]">{section.lead}</p>
          <ol className="mt-8 grid grid-cols-3 gap-3" aria-label="SPOMOVE 흐름">
            {section.flowSteps.slice(0, 3).map((step, index) => (
              <li key={step.label} className="border-t border-white/20 pt-3">
                <span className="text-xs font-bold text-[#7FA6FF]">0{index + 1}</span>
                <strong className="mt-1 block text-sm text-white">{step.label}</strong>
                <span className="mt-1 block text-xs text-[#9EACC2]">{step.hint}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-relaxed text-[#AFC0D8]">SPOMAT은 SPOMOVE를 실제 공간에서 실행하는 도구입니다.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedLink href={section.primaryCta.href} trackLabel={section.primaryCta.trackLabel} className={marketingButtonPrimaryOnDark}>{section.primaryCta.label}</TrackedLink>
            <TrackedLink href={section.secondaryCta.href} trackLabel={section.secondaryCta.trackLabel} className={marketingButtonSecondaryOnDark}>{section.secondaryCta.label}</TrackedLink>
          </div>
        </div>
        <MediaPanel media={HOME_MEDIA[section.mediaKey]} className={`${marketingMediaFrame} ${homePhotoGrade} aspect-[16/11] min-h-[28rem] w-full border-white/10`} sizes="card1" objectFit="cover" />
      </div>
    </section>
  );
}
