import PrivateLanding from '../components/private-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { privatePage } from '../data/private-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('private');

export default function SpokeduPrivatePage() {
  return (
    <LandingPageRoot heroMediaKey={privatePage.hero.mediaKey}>
      <PrivateLanding />
    </LandingPageRoot>
  );
}
