import { LandingPageRoot } from '../components/landing-page-root';
import { SpomatLanding } from '../components/spomat-landing';
import { spomatPage } from '../data/spomat-page';
import { buildSpokeduPageMetadata } from '../data/seo';

export const metadata = buildSpokeduPageMetadata({
  title: 'SPOMAT | SPOMOVE 실행 도구 SPOKEDU',
  description:
    'SPOMAT은 SPOMOVE를 실행하는 2×2 색 위치 패드입니다. SPOMOVE와 동일한 제품이 아니며, 가격은 제품 경로에서 확인합니다.',
  canonical: '/spokedu/spomat',
  keywords: ['SPOMAT', 'SPOMOVE', '체육 교구', '스포키듀'],
  pageKey: 'programs',
});

export default function SpokeduSpomatPage() {
  return (
    <LandingPageRoot heroMediaKey={spomatPage.definition.mediaKey}>
      <SpomatLanding />
    </LandingPageRoot>
  );
}
