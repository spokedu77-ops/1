import { ProgramDetailTemplate, buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('camp');

export default function SpokeduProgramCampPage() {
  return <ProgramDetailTemplate slug="camp" />;
}
