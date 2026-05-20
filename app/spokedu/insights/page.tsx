import { InsightsLanding } from '../components/insights-landing';
import { buildSpokeduPageMetadata, seoMetaInsights } from '../data/seo';

export const metadata = buildSpokeduPageMetadata({
  ...seoMetaInsights,
  canonical: '/spokedu/insights',
  keywords: ['아동 체육교육', 'SPOMOVE', 'PAPS', '체육 커리큘럼', '학부모 가이드'],
});

export default function SpokeduInsightsPage() {
  return <InsightsLanding />;
}
