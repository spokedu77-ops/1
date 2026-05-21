import ProgramsLanding from '../components/programs-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('programs');

export default function SpokeduProgramsPage() {
  return <ProgramsLanding />;
}
