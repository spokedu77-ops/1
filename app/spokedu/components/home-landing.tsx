'use client';

import { SPOKEDU_HOME_BUILD_ID } from '../data/home-build';
import { homePage } from '../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import HomeEditorialLanding, { mergeHomeEditorialCaseCards } from './home/home-editorial-landing';

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

/** FIELD-BUILT EDITORIAL — Constitution-locked Home */
export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const caseCards = mergeHomeEditorialCaseCards(proofCards);

  return (
    <div data-spokedu-home-build={SPOKEDU_HOME_BUILD_ID} data-spokedu-home-sections={homePage.sectionOrder.length}>
      <HomeEditorialLanding caseCards={caseCards} />
    </div>
  );
}
