import SpokeduHomeLanding from './components/home-landing';
import { SpokeduRelatedLinks } from './components/seo-related-links';
import { buildSpokeduMetadata } from './data/seo';

export const metadata = buildSpokeduMetadata('home');

export default function SpokeduHomePage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <SpokeduHomeLanding />
      <SpokeduRelatedLinks page="home" />
    </div>
  );
}
