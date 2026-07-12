'use client';

import { SPOKEDU_HOME_BUILD_ID } from '../data/home-build';
import { homePage } from '../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { homePageSurface, homeSkipLink } from '../lib/ui-classes';
import { HomeAudienceGates } from './home/home-audience-gates';
import { HomeFieldRecords, mergeHomeCaseCards } from './home/home-field-records';
import { HomeFinalCta } from './home/home-final-cta';
import { HomeHero } from './home/home-hero';
import { HomePartnerReviews } from './home/home-partner-reviews';
import { HomeProofStrip } from './home/home-proof-strip';
import { HomeSpomoveSpotlight } from './home/home-spomove-spotlight';

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const caseCards = mergeHomeCaseCards(proofCards);

  return (
    <div
      className={`w-full overflow-x-clip font-sans antialiased ${homePageSurface}`}
      data-spokedu-home-build={SPOKEDU_HOME_BUILD_ID}
    >
      <a href={`#${homePage.audienceGate.id}`} className={homeSkipLink}>
        본문으로 건너뛰기
      </a>

      <HomeHero />
      <HomeProofStrip />
      <HomeAudienceGates />
      <HomeSpomoveSpotlight />
      <HomeFieldRecords caseCards={caseCards} />
      <HomePartnerReviews />
      <HomeFinalCta />
    </div>
  );
}
