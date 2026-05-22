import SpomoveProgramLanding from '../../components/spomove-program-landing';
import { buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('spomove');

export default function SpokeduProgramSpomovePage() {
  return <SpomoveProgramLanding />;
}
