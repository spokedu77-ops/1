'use client';

import { useEffect, useMemo, useState } from 'react';
import { logAdminProductivity } from '@/app/lib/logging/logClient';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  useRotationScheduleQuarter,
  useSaveSchedule,
  type ScheduleLightRow,
} from '@/app/lib/admin/hooks/useRotationSchedule';
import { generate48WeekSlots } from '@/app/lib/admin/scheduler/dragAndDrop';
import { SchedulerMonthAccordion } from '@/app/components/admin/scheduler/SchedulerMonthAccordion';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

function getCurrentQuarter(): 1 | 2 | 3 | 4 {
  return Math.ceil(CURRENT_MONTH / 3) as 1 | 2 | 3 | 4;
}

const QUARTER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Q1 (1~3월)',
  2: 'Q2 (4~6월)',
  3: 'Q3 (7~9월)',
  4: 'Q4 (10~12월)',
};

export default function SchedulerPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [year, setYear] = useState(CURRENT_YEAR);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(getCurrentQuarter());
  const [openMonth, setOpenMonth] = useState<number | null>(CURRENT_MONTH);

  const { data: scheduleRows, refetch: refetchSchedule } = useRotationScheduleQuarter({
    year,
    quarter,
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

  const monthsInQuarter = useMemo(() => {
    const start = (quarter - 1) * 3 + 1;
    return [start, start + 1, start + 2];
  }, [quarter]);

  const slotsByMonth = useMemo(() => {
    const slots = generate48WeekSlots(year);
    const byMonth: Record<number, typeof slots> = {};
    for (const m of monthsInQuarter) {
      byMonth[m] = slots.filter((s) => s.month === m);
    }
    return byMonth;
  }, [year, monthsInQuarter]);

  const rowMap = useMemo(() => {
    const m = new Map<string, ScheduleLightRow>();
    for (const r of scheduleRows ?? []) m.set(r.week_key, r);
    return m;
  }, [scheduleRows]);

  useEffect(() => {
    logAdminProductivity({
      event_type: 'SCHEDULE_OPEN',
      month_key: `${year}-Q${quarter}`,
    });
  }, [year, quarter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Scheduler</h2>
          <p className="mt-1 text-sm text-neutral-400">
            분기별로 주차에 프로그램 배정 후 공개
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            프로그램 선택 후 <strong>배정 &amp; 공개</strong> 버튼으로 한 번에 저장됩니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="cursor-pointer rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {([1, 2, 3, 4] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuarter(q)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  quarter === q
                    ? 'bg-cyan-600 text-white'
                    : 'border border-neutral-600 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {QUARTER_LABELS[q]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {monthsInQuarter.map((month) => {
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
              onSave={async (vars) => {
                await saveSchedule.mutateAsync(vars);
                await refetchSchedule();
              }}
              isSaving={saveSchedule.isPending}
            />
          );
        })}
      </div>
    </div>
  );
}
