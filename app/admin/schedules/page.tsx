import { getSchedules } from './actions/schedules';
import SchedulesClient from './SchedulesClient';

export default async function SchedulesPage() {
  const initialSchedules = await getSchedules({ orderBy: 'start_date_asc' });
  return <SchedulesClient initialSchedules={initialSchedules} />;
}
