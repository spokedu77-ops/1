import { AboutLanding } from '../components/about-landing';
import { buildSpokeduPageMetadata, seoMetaAboutPage } from '../data/seo';

export const metadata = buildSpokeduPageMetadata({
  ...seoMetaAboutPage,
  canonical: '/spokedu/about',
  keywords: ['아동 체육교육', 'SPOKEDU', '체육 커리큘럼', 'SPOMOVE'],
});

export default function SpokeduAboutPage() {
  return <AboutLanding />;
}
