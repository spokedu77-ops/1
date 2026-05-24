import CurriculumLanding from '../components/curriculum-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { curriculumPage } from '../data/curriculum-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('curriculum');

export default function SpokeduCurriculumPage() {
  return (
    <LandingPageRoot heroMediaKey={curriculumPage.hero.mediaKey}>
      <CurriculumLanding />
    </LandingPageRoot>
  );
}
