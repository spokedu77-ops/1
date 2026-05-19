import PrivateLanding from '../components/private-landing';
import { SpokeduRelatedLinks } from '../components/seo-related-links';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('private');

export default function SpokeduPrivatePage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <PrivateLanding />
      <SpokeduRelatedLinks page="private" />
    </div>
  );
}
