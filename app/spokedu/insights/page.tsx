import { InsightsLanding } from '../components/insights-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('insights');

export default function InsightsLandingPage() {
  return <InsightsLanding />;
}
