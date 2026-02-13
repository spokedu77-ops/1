import { getSchedules } from './actions/schedules';
import SchedulesClient from './SchedulesClient';

export default async function SchedulesPage() {
  let initialSchedules;
  try {
    initialSchedules = await getSchedules({
      limit: 50,
      orderBy: 'start_date_asc',
    });
  } catch (err) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md px-4 text-center">
          <p className="text-sm font-bold text-red-600">
            {err instanceof Error ? err.message : '일정을 불러올 수 없습니다.'}
          </p>
        </div>
      </div>
    );
  }
  return <SchedulesClient initialSchedules={initialSchedules} />;
}
