import { CasesLanding } from '../components/cases-landing';
import { buildSpokeduPageMetadata, seoMetaCases } from '../data/seo';

export const metadata = buildSpokeduPageMetadata({
  ...seoMetaCases,
  canonical: '/spokedu/cases',
  keywords: ['수업 사례', '키움센터 체육 프로그램', 'SPOMOVE', '기관 체육수업'],
});

export default function SpokeduCasesPage() {
  return <CasesLanding />;
}
