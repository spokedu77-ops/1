import ProgramsLanding from '../components/programs-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { programsPage } from '../data/programs-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('programs');

export default function SpokeduProgramsPage() {
  return (
    <LandingPageRoot heroMediaKey={programsPage.hero.mediaKey}>
      <ProgramsLanding />
    </LandingPageRoot>
  );
}
