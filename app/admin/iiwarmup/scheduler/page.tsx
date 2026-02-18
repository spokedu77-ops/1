'use client';

import { useEffect, useMemo, useState } from 'react';
import { logAdminProductivity } from '@/app/lib/logging/logClient';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  useRotationScheduleQuarter,
  useRotationScheduleLight,
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

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export default function SchedulerPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [year, setYear] = useState(CURRENT_YEAR);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(getCurrentQuarter());
  const [openMonth, setOpenMonth] = useState<number | null>(CURRENT_MONTH);
  const [show48Detail, setShow48Detail] = useState(false);

  const { data: scheduleRows, refetch: refetchSchedule } = useRotationScheduleQuarter({
    year,
    quarter,
  });

  const { data: fullYearRows = [] } = useRotationScheduleLight(year);
  const fullYearRowMap = useMemo(() => {
    const m = new Map<string, ScheduleLightRow>();
    for (const r of fullYearRows) m.set(r.week_key, r);
    return m;
  }, [fullYearRows]);
  const allSlots = useMemo(() => generate48WeekSlots(year), [year]);
  const slotsByMonthForDetail = useMemo(() => {
    const byMonth: Record<number, typeof allSlots> = {};
    for (let m = 1; m <= 12; m++) {
      byMonth[m] = allSlots.filter((s) => s.month === m);
    }
    return byMonth;
  }, [allSlots]);

  const { data: programs = [] } = useQuery({
    queryKey: ['warmup-programs-list', !!supabase],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('warmup_programs_composite')
        .select('id, title, week_id')
        .order('week_id', { ascending: true });
      if (error) throw error;
      return (data || []) as { id: string; title: string; week_id: string | null }[];
    },
    enabled: !!supabase,
  });

  /** 해당 월 주차 프로그램만 (2월 아코디언 → 2월 주차만 드롭다운에 표시). 띵크(Think 150) 템플릿은 매 월 목록에 추가. 1~4주차 순서로 정렬 */
  const programsByMonth = useMemo(() => {
    const getWeekOrder = (id: string): number => {
      const thinkMatch = id.match(/^think150_week([1-4])$/);
      if (thinkMatch) return Number(thinkMatch[1]);
      const challengeMatch = id.match(/^challenge_\d{4}-\d{2}-W([1-4])$/);
      if (challengeMatch) return Number(challengeMatch[1]);
      return 5;
    };
    const byMonth: Record<number, { id: string; title: string }[]> = {};
    const prefix = (m: number) => `${year}-${String(m).padStart(2, '0')}-`;
    const templatePrograms = programs
      .filter((p) => p.week_id === 'template' || (p.id != null && p.id.startsWith('think150_')))
      .map((p) => ({ id: p.id, title: p.title }));
    for (let m = 1; m <= 12; m++) {
      const monthPrograms = programs
        .filter((p) => p.week_id != null && p.week_id.startsWith(prefix(m)))
        .map((p) => ({ id: p.id, title: p.title }));
      const combined = [...monthPrograms, ...templatePrograms];
      byMonth[m] = combined.sort(
        (a, b) => getWeekOrder(a.id) - getWeekOrder(b.id) || a.id.localeCompare(b.id)
      );
    }
    return byMonth;
  }, [year, programs]);

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

      <section className="rounded-xl border border-neutral-700 bg-neutral-900/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShow48Detail((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-neutral-200 hover:bg-neutral-800/50"
        >
          <span>48주(연간) 스케줄 상세</span>
          <span className="text-neutral-500">{show48Detail ? '▼' : '▶'}</span>
        </button>
        {show48Detail && (
          <div className="border-t border-neutral-700 p-4">
            <p className="mb-3 text-xs text-neutral-500">{year}년 전체 주차별 배정·공개 현황</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-600 text-neutral-400">
                    <th className="pb-2 pr-4 font-medium">월</th>
                    <th className="pb-2 pr-2 font-medium">1주</th>
                    <th className="pb-2 pr-2 font-medium">2주</th>
                    <th className="pb-2 pr-2 font-medium">3주</th>
                    <th className="pb-2 font-medium">4주</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.from({ length: 12 }, (_, i) => i + 1) as number[]).map((month) => (
                    <tr key={month} className="border-b border-neutral-700/80">
                      <td className="py-2 pr-4 font-medium text-neutral-300">{MONTH_LABELS[month - 1]}</td>
                      {(slotsByMonthForDetail[month] ?? []).map((slot) => {
                        const row = fullYearRowMap.get(slot.weekKey);
                        const assigned = !!row?.program_id;
                        const published = !!row?.is_published;
                        return (
                          <td key={slot.weekKey} className="py-2 pr-2">
                            <span
                              className="inline-block rounded px-1.5 py-0.5 text-xs"
                              title={row?.programTitle ?? slot.weekKey}
                            >
                              {assigned ? (published ? '공개' : '배정') : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

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
              programs={programsByMonth[month] ?? []}
              allPrograms={programs}
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
