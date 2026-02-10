'use client';

import { useId, useState } from 'react';

export type WeekSelectorChangePayload = {
  year: number;
  month: number;
  week: number;
  label: string;
};

export interface WeekSelectorProps {
  year: number;
  month: number;
  week: number;
  onChange: (payload: WeekSelectorChangePayload) => void;
}

function formatLabel(year: number, month: number, week: number): string {
  return `${year}년 ${month}월 · ${week}주차`;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const WEEKS = [1, 2, 3, 4, 5] as const;

export function WeekSelector({ year, month, week, onChange }: WeekSelectorProps) {
  const [yearOpen, setYearOpen] = useState(false);
  const yearId = useId();
  const monthId = useId();
  const weekId = useId();

  const label = formatLabel(year, month, week);
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const handleYear = (y: number) => {
    setYearOpen(false);
    onChange({ year: y, month, week, label: formatLabel(y, month, week) });
  };
  const handleMonth = (m: number) => {
    onChange({ year, month: m, week, label: formatLabel(year, m, week) });
  };
  const handleWeek = (w: number) => {
    onChange({ year, month, week: w, label: formatLabel(year, month, w) });
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-white" id={monthId}>
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            aria-label="연도 선택"
            aria-expanded={yearOpen}
            aria-haspopup="listbox"
            id={yearId}
            className="min-h-[44px] rounded-xl border border-neutral-600 bg-neutral-800/80 px-4 py-2.5 text-left text-sm font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            onClick={() => setYearOpen((o) => !o)}
          >
            {year}년
          </button>
          {yearOpen && (
            <>
              <div className="absolute top-full left-0 z-10 mt-1 w-28 rounded-xl border border-neutral-600 bg-neutral-800 py-1 shadow-xl">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    role="option"
                    aria-selected={y === year}
                    className="min-h-[44px] w-full px-4 text-left text-sm text-white hover:bg-neutral-700 focus-visible:bg-neutral-700 focus-visible:outline-none"
                    onClick={() => handleYear(y)}
                  >
                    {y}년
                  </button>
                ))}
              </div>
              <div
                className="fixed inset-0 z-0"
                aria-hidden
                onClick={() => setYearOpen(false)}
              />
            </>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="group" aria-labelledby={monthId}>
          {MONTHS.map((m) => (
            <button
              key={m}
              type="button"
              aria-label={`${m}월 선택`}
              className={`min-h-[44px] shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                month === m
                  ? 'bg-cyan-600 text-white'
                  : 'border border-neutral-600 bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700'
              }`}
              onClick={() => handleMonth(m)}
            >
              {m}월
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={weekId}>
          {WEEKS.map((w) => (
            <button
              key={w}
              type="button"
              aria-label={`${w}주차 선택`}
              className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                week === w
                  ? 'bg-cyan-600 text-white'
                  : 'border border-neutral-600 bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700'
              }`}
              onClick={() => handleWeek(w)}
            >
              {w}주차
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
