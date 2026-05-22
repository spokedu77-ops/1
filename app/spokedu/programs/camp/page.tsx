import CampProgramLanding from '../../components/camp-program-landing';
import { buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('camp');

export default function SpokeduProgramCampPage() {
  return <CampProgramLanding />;
}
