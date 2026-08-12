'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homePhotoGrade,
  homeSectionScrollMt,
  marketingBandWhite,
  marketingButtonPrimary,
  marketingButtonSecondary,
  marketingEyebrow,
  marketingMediaFrame,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionLead,
  marketingSectionPad,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeWhySpokedu() {
  const section = homePage.education;
  return (
    <section id={section.id} className={`${homeSectionScrollMt} ${marketingBandWhite} ${marketingSectionPad}`} aria-labelledby="home-education-heading">
      <div className={`${marketingSectionInner} grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center lg:gap-16`}>
        <MediaPanel media={HOME_MEDIA[section.mediaKey]} className={`${marketingMediaFrame} ${homePhotoGrade} aspect-[4/3] w-full`} sizes="card1" objectFit="cover" />
        <div>
          <p className={marketingEyebrow}>{section.eyebrow}</p>
          <h2 id="home-education-heading" className={`${marketingSectionDisplay} mt-3 whitespace-pre-line`}>{section.title}</h2>
          <p className={`${marketingSectionLead} mt-5`}>{section.lead}</p>
          <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3 text-sm font-semibold text-[#14213A]">
            {section.points.map((point) => <li key={point} className="border-t border-[#DCE3EE] pt-3">{point}</li>)}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedLink href={section.primaryCta.href} trackLabel={section.primaryCta.trackLabel} className={marketingButtonPrimary}>{section.primaryCta.label}</TrackedLink>
            <TrackedLink href={section.secondaryCta.href} trackLabel={section.secondaryCta.trackLabel} className={marketingButtonSecondary}>{section.secondaryCta.label}</TrackedLink>
          </div>
        </div>
      </div>
    </section>
  );
}
