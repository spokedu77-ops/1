'use client';

import { useState, useEffect } from 'react';
import { getSchedules } from './actions/schedules';
import type { Schedule } from '@/app/lib/schedules/types';
import SchedulesClient from './SchedulesClient';

export default function SchedulesPage() {
  const [initialSchedules, setInitialSchedules] = useState<Schedule[] | null>(null);

  useEffect(() => {
    getSchedules({ orderBy: 'start_date_asc' }).then(setInitialSchedules);
  }, []);

  if (initialSchedules === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return <SchedulesClient initialSchedules={initialSchedules} />;
}
