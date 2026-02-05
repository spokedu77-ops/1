'use client';

import { useEffect, useMemo, useState } from 'react';
import { logAdminProductivity } from '@/app/lib/logging/logClient';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  useRotationScheduleMonth,
  useSaveSchedule,
  type ScheduleLightRow,
} from '@/app/lib/admin/hooks/useRotationSchedule';
import { useCreateThink150Programs } from '@/app/lib/admin/hooks/useCreateThink150Programs';
import { generate48WeekSlots } from '@/app/lib/admin/scheduler/dragAndDrop';
import { SchedulerMonthAccordion } from '@/app/components/admin/scheduler/SchedulerMonthAccordion';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

export default function SchedulerPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [year, setYear] = useState(CURRENT_YEAR);
  const [openMonth, setOpenMonth] = useState<number | null>(CURRENT_MONTH);

  const monthToFetch = openMonth ?? CURRENT_MONTH;
  const { data: scheduleRows } = useRotationScheduleMonth({
    year,
    month: monthToFetch,
    prefetchNeighbor: true,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['warmup-programs-list', !!supabase],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('warmup_programs_composite')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return (data || []) as { id: string; title: string }[];
    },
    enabled: !!supabase,
  });

  const saveSchedule = useSaveSchedule();
  const createThink150 = useCreateThink150Programs();

  const slotsByMonth = useMemo(() => {
    const slots = generate48WeekSlots(year);
    const byMonth: Record<number, typeof slots> = {};
    for (const s of slots) {
      if (!byMonth[s.month]) byMonth[s.month] = [];
      byMonth[s.month].push(s);
    }
    return byMonth;
  }, [year]);

  const rowMap = useMemo(() => {
    const m = new Map<string, ScheduleLightRow>();
    for (const r of scheduleRows ?? []) m.set(r.week_key, r);
    return m;
  }, [scheduleRows]);

  useEffect(() => {
    logAdminProductivity({
      event_type: 'SCHEDULE_OPEN',
      month_key: `${year}-${String(monthToFetch).padStart(2, '0')}`,
    });
  }, [year, monthToFetch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Scheduler</h2>
          <p className="mt-1 text-sm text-neutral-400">
            월별 주차에 프로그램 배정 후 Publish
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            onClick={() => createThink150.mutate()}
            disabled={createThink150.isPending}
          >
            {createThink150.isPending ? '생성 중...' : 'Think 150 기본 생성'}
          </button>
          {createThink150.isError && (
            <span className="text-sm text-red-400">
              {(createThink150.error as Error).message}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const slots = slotsByMonth[month] ?? [];
          const isOpen = openMonth === month;
          return (
            <SchedulerMonthAccordion
              key={month}
              year={year}
              month={month}
              slots={slots}
              rowMap={rowMap}
              programs={programs}
              isOpen={isOpen}
              onToggle={() => setOpenMonth(isOpen ? null : month)}
              onSave={saveSchedule.mutateAsync}
              isSaving={saveSchedule.isPending}
            />
          );
        })}
      </div>
    </div>
  );
}
