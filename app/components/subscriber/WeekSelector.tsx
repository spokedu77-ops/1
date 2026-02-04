'use client';

import { generateWeekKey } from '@/app/lib/admin/assets/storagePaths';

const MONTH_LABELS: Record<number, string> = {
  1: '1월', 2: '2월', 3: '3월', 4: '4월', 5: '5월', 6: '6월',
  7: '7월', 8: '8월', 9: '9월', 10: '10월', 11: '11월', 12: '12월',
};

export interface WeekSelectorProps {
  year: number;
  month: number;
  week: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
}

export function WeekSelector({
  year,
  month,
  week,
  onYearChange,
  onMonthChange,
  onWeekChange,
}: WeekSelectorProps) {
  const weekKey = generateWeekKey(year, month, week);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className="rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-sm text-white transition focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
      >
        {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
          <option key={y} value={y}>{y}년</option>
        ))}
      </select>
      <select
        className="rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-sm text-white transition focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        value={month}
        onChange={(e) => onMonthChange(Number(e.target.value))}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>{MONTH_LABELS[m]}</option>
        ))}
      </select>
      <select
        className="rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-sm text-white transition focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        value={week}
        onChange={(e) => onWeekChange(Number(e.target.value))}
      >
        {[1, 2, 3, 4].map((w) => (
          <option key={w} value={w}>{w}주차</option>
        ))}
      </select>
      <span className="font-mono text-xs text-neutral-600">{weekKey}</span>
    </div>
  );
}
