import { ProgramDetailTemplate, buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('spomove');

export default function SpokeduProgramSpomovePage() {
  return <ProgramDetailTemplate slug="spomove" />;
}
