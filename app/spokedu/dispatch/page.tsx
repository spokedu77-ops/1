import DispatchLanding from '../components/dispatch-landing';
import { SpokeduRelatedLinks } from '../components/seo-related-links';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('dispatch');

export default function SpokeduDispatchPage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <DispatchLanding />
      <SpokeduRelatedLinks page="dispatch" />
    </div>
  );
}
