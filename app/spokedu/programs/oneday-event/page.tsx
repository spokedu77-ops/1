import OnedayEventProgramLanding from '../../components/oneday-event-program-landing';
import { buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('oneday-event');

export default function SpokeduProgramOnedayEventPage() {
  return <OnedayEventProgramLanding />;
}
