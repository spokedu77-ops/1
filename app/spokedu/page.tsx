import SpokeduHomeLanding from './components/home-landing';
import { HomeStructuredData } from './components/home-structured-data';
import { LandingPageRoot } from './components/landing-page-root';
import { buildSpokeduMetadata } from './data/seo';

export const metadata = buildSpokeduMetadata('home');

export default function SpokeduHomePage() {
  return (
    <LandingPageRoot heroMediaKey="homeHero">
      <HomeStructuredData />
      <SpokeduHomeLanding />
    </LandingPageRoot>
  );
}
