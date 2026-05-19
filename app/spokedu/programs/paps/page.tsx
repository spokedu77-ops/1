import { ProgramDetailTemplate, buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('paps');

export default function SpokeduProgramPapsPage() {
  return <ProgramDetailTemplate slug="paps" />;
}
