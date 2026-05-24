import { InsightsLanding } from '../components/insights-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { insightsPage } from '../data/insights-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('insights');

export default function InsightsLandingPage() {
  return (
    <LandingPageRoot heroMediaKey={insightsPage.hero.mediaKey}>
      <InsightsLanding />
    </LandingPageRoot>
  );
}
