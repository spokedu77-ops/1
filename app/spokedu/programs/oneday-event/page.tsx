import { ProgramDetailTemplate, buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('oneday-event');

export default function SpokeduProgramOnedayEventPage() {
  return <ProgramDetailTemplate slug="oneday-event" />;
}
