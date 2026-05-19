import CurriculumLanding from '../components/curriculum-landing';
import { SpokeduRelatedLinks } from '../components/seo-related-links';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('curriculum');

export default function SpokeduCurriculumPage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <CurriculumLanding />
      <SpokeduRelatedLinks page="curriculum" />
    </div>
  );
}
