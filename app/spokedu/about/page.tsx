import { AboutLanding } from '../components/about-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { aboutPage } from '../data/about-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('about');

export default function SpokeduAboutPage() {
  return (
    <LandingPageRoot heroMediaKey={aboutPage.hero.mediaKey}>
      <AboutLanding />
    </LandingPageRoot>
  );
}
