import { getSchedules } from './actions/schedules';
import { getCenters } from '../centers/actions/centers';
import { ScheduleCenterTabs } from './components/ScheduleCenterTabs';

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
  let initialCenters: Awaited<ReturnType<typeof getCenters>> = [];
  try {
    initialCenters = await getCenters({});
  } catch {
    // 센터 목록 실패 시 빈 배열로 일정만 표시
  }
  return (
    <ScheduleCenterTabs
      initialSchedules={initialSchedules}
      initialCenters={initialCenters}
    />
  );
}
