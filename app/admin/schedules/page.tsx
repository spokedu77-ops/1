import { getSchedules } from './actions/schedules';
import { getCenters } from '../centers/actions/centers';
import { ScheduleCenterTabs } from './components/ScheduleCenterTabs';

export default async function SchedulesPage() {
  const [schedulesResult, centersResult] = await Promise.allSettled([
    getSchedules({ limit: 50, orderBy: 'start_date_asc' }),
    getCenters({}),
  ]);
  const initialSchedules =
    schedulesResult.status === 'fulfilled' ? schedulesResult.value : [];
  const initialCenters: Awaited<ReturnType<typeof getCenters>> =
    centersResult.status === 'fulfilled' ? centersResult.value : [];

  if (schedulesResult.status === 'rejected') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md px-4 text-center">
          <p className="text-sm font-bold text-red-600">
            {schedulesResult.reason instanceof Error
              ? schedulesResult.reason.message
              : '일정을 불러올 수 없습니다.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScheduleCenterTabs
      initialSchedules={initialSchedules}
      initialCenters={initialCenters}
    />
  );
}
