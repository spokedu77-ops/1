import { CasesLanding } from '../components/cases-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { casesPage } from '../data/cases-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('cases');

export default function SpokeduCasesPage() {
  return (
    <LandingPageRoot heroMediaKey={casesPage.hero.mediaKey}>
      <CasesLanding />
    </LandingPageRoot>
  );
}
