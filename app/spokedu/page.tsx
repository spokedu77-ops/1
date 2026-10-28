import SpokeduHomeLanding from './components/home-landing';
import { HOME_V0_HERO } from './data/home-v0-media';
import { HomeStructuredData } from './components/home-structured-data';
import { LandingPageRoot } from './components/landing-page-root';
import { homePage } from './data/home-page';
import { buildSpokeduMetadata } from './data/seo';

export const metadata = buildSpokeduMetadata('home');
export const revalidate = 86400;

export default function SpokeduHomePage() {
  return (
    <LandingPageRoot preloadSrc={HOME_V0_HERO.src}>
      <HomeStructuredData />
      <SpokeduHomeLanding proofCards={[...homePage.cases.cards]} />
    </LandingPageRoot>
  );
}
