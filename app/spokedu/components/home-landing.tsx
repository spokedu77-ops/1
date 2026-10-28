'use client';

import { SPOKEDU_HOME_BUILD_ID } from '../data/home-build';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { HomeV0Landing } from './home-v0-landing';

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

/** HOME web-first lock — one viewport, one message. */
export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  void proofCards;
  return (
    <div data-spokedu-home-build={SPOKEDU_HOME_BUILD_ID} data-spokedu-home-sections="6">
      <HomeV0Landing />
    </div>
  );
}
