'use client';

import { SPOKEDU_HOME_BUILD_ID } from '../data/home-build';
import { homePage } from '../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { homePageSurface, homeSkipLink } from '../lib/ui-classes';
import { HomeAudienceGates } from './home/home-audience-gates';
import { HomeCycle } from './home/home-cycle';
import { HomeEvidenceStrip } from './home/home-evidence-strip';
import { mergeHomeCaseCards } from './home/home-field-records';
import { HomeFinalCta } from './home/home-final-cta';
import { HomeHero } from './home/home-hero';
import { HomePillars } from './home/home-pillars';
import { HomeSpomoveSpotlight } from './home/home-spomove-spotlight';

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

/**
 * 홈 흐름 (PR2 · 최상위 7섹션)
 * 히어로 → 4경로 → 진입점 관계 → 순환 → SPOMOVE+사례 → 증거 → 최종 CTA
 */
export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const caseCards = mergeHomeCaseCards(proofCards);
  const featuredCase = caseCards[0] ?? homePage.spomove.featuredCase;

  return (
    <div
      className={`w-full overflow-x-clip font-sans antialiased ${homePageSurface}`}
      data-spokedu-home-build={SPOKEDU_HOME_BUILD_ID}
      data-spokedu-home-sections={homePage.sectionOrder.length}
    >
      <a href={`#${homePage.audienceGate.id}`} className={homeSkipLink}>
        본문으로 건너뛰기
      </a>

      <HomeHero />
      <HomeAudienceGates />
      <HomePillars />
      <HomeCycle />
      <HomeSpomoveSpotlight featuredCase={featuredCase} />
      <HomeEvidenceStrip />
      <HomeFinalCta />
    </div>
  );
}
