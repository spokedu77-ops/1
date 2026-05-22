import PapsProgramLanding from '../../components/paps-program-landing';
import { buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('paps');

export default function SpokeduProgramPapsPage() {
  return <PapsProgramLanding />;
}
