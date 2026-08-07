import { LandingPageRoot } from '../components/landing-page-root';
import { PartnersLanding } from '../components/partners-landing';
import { buildSpokeduPageMetadata } from '../data/seo';

export const metadata = buildSpokeduPageMetadata({
  title: '파트너·협업 안내 | SPOKEDU',
  description:
    '기관·공공, 콘텐츠·장비, 지도자 교육 등 SPOKEDU와 협업할 수 있는 범위를 안내합니다. 문의는 Contact에서 이어집니다.',
  canonical: '/spokedu/partners',
  keywords: ['스포키듀 협업', '기관 체육 협업', '지도자 교육 협업'],
  pageKey: 'contact',
});

export default function SpokeduPartnersPage() {
  return (
    <LandingPageRoot heroMediaKey="trackDispatch">
      <PartnersLanding />
    </LandingPageRoot>
  );
}
