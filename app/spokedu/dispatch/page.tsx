import { Suspense } from 'react';
import DispatchLanding from '../components/dispatch-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { dispatchPage } from '../data/dispatch-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('dispatch');

export default function SpokeduDispatchPage() {
  return (
    <LandingPageRoot heroMediaKey={dispatchPage.hero.mediaKey}>
      <Suspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
        <DispatchLanding />
      </Suspense>
    </LandingPageRoot>
  );
}
