import MonthlyNewsportsProgramLanding from '../../components/monthly-newsports-program-landing';
import { buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('monthly-newsports');

export default function SpokeduProgramMonthlyNewsportsPage() {
  return <MonthlyNewsportsProgramLanding />;
}
