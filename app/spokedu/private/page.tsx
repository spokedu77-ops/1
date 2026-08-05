import { Suspense } from 'react';
import PrivateLanding from '../components/private-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { privatePage } from '../data/private-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('private');

export default function SpokeduPrivatePage() {
  return (
    <LandingPageRoot heroMediaKey={privatePage.hero.mediaKey}>
      <Suspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
        <PrivateLanding />
      </Suspense>
    </LandingPageRoot>
  );
}
