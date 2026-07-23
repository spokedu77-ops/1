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
import { HomeTrustStrip } from './home/home-trust-strip';

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

/**
 * 홈 흐름
 * 히어로(1) → 신뢰 지표 → 경로 선택 → SPOMOVE → 왜 SPOKEDU → 사례 → 후기 → 상담 CTA
 */
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
      <HomeTrustStrip />
      <HomeAudienceGates />
      <HomeSpomoveSpotlight />
      <HomeProofStrip />
      <HomeFieldRecords caseCards={caseCards} />
      <HomePartnerReviews />
      <HomeFinalCta />
    </div>
  );
}
