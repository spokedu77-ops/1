'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSchedules } from './actions/schedules';
import type { Schedule } from '@/app/lib/schedules/types';
import SchedulesClient from './SchedulesClient';

export default function SchedulesPage() {
  const [initialSchedules, setInitialSchedules] = useState<Schedule[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    setFetchError(null);
    setInitialSchedules(null);
    try {
      const data = await getSchedules({ orderBy: 'start_date_asc' });
      setInitialSchedules(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '일정을 불러올 수 없습니다.');
      setInitialSchedules([]);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  if (initialSchedules === null && !fetchError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md px-4 text-center">
          <p className="text-sm font-bold text-red-600">{fetchError}</p>
          <button
            type="button"
            onClick={loadSchedules}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return <SchedulesClient initialSchedules={initialSchedules ?? []} />;
}
