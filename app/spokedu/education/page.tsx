import { EducationHubLanding } from '../components/education-hub-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('education');

export default function SpokeduEducationPage() {
  return <EducationHubLanding />;
}
