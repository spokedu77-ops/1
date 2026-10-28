import { Suspense } from 'react';
import PrivateLanding from '../components/private-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { PRIVATE_V0_HERO } from '../data/private-v0-media';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('private');

export default function SpokeduPrivatePage() {
  return (
    <LandingPageRoot preloadSrc={PRIVATE_V0_HERO.src}>
      <Suspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
        <PrivateLanding />
      </Suspense>
    </LandingPageRoot>
  );
}
