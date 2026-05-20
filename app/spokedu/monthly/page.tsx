import { MonthlyLanding } from '../components/monthly-landing';
import { buildSpokeduPageMetadata, seoMetaMonthly } from '../data/seo';

export const metadata = buildSpokeduPageMetadata({
  ...seoMetaMonthly,
  canonical: '/spokedu/monthly',
  keywords: ['월간 스포키듀', '기관 체육수업', '체육 커리큘럼', 'SPOMOVE'],
});

export default function SpokeduMonthlyPage() {
  return <MonthlyLanding />;
}
