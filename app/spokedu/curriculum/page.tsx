import CurriculumLanding from '../components/curriculum-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('curriculum');

export default function SpokeduCurriculumPage() {
  return <CurriculumLanding />;
}
