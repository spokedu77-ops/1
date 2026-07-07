import SpokeduHomeLanding from './components/home-landing';
import { HomeStructuredData } from './components/home-structured-data';
import { LandingPageRoot } from './components/landing-page-root';
import { homePage } from './data/home-page';
import { buildSpokeduMetadata } from './data/seo';

export const metadata = buildSpokeduMetadata('home');
export const revalidate = 86400;

export default function SpokeduHomePage() {
  return (
    <LandingPageRoot heroMediaKey={homePage.hero.mediaKey}>
      <HomeStructuredData />
      <SpokeduHomeLanding proofCards={homePage.cases.cards} />
    </LandingPageRoot>
  );
}
