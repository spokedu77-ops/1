import { CasesLanding } from '../components/cases-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('cases');

export default function SpokeduCasesPage() {
  return <CasesLanding />;
}
