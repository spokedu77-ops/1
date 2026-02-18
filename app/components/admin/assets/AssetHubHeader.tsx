'use client';

const MONTH_LABELS: Record<number, string> = {
  1: '1월', 2: '2월', 3: '3월', 4: '4월', 5: '5월', 6: '6월',
  7: '7월', 8: '8월', 9: '9월', 10: '10월', 11: '11월', 12: '12월',
};

export interface AssetHubHeaderProps {
  year: number;
  month: number;
  week: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
  /** Think는 [2,3,4], Play는 [1,2,3,4] */
  weekOptions?: readonly number[];
}

export function AssetHubHeader({
  year,
  month,
  week,
  onYearChange,
  onMonthChange,
  onWeekChange,
  weekOptions = [2, 3, 4],
}: AssetHubHeaderProps) {
  const weeks: number[] = Array.isArray(weekOptions)
    ? [...weekOptions]
    : [2, 3, 4];
  const showWeek = weeks.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-neutral-400">연도:</span>
      <select
        className="rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-sm"
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
      >
        {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
          <option key={y} value={y}>{y}년</option>
        ))}
      </select>
      <span className="ml-2 text-sm text-neutral-400">월:</span>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
        <button
          key={m}
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            month === m ? 'bg-blue-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'
          }`}
          onClick={() => onMonthChange(m)}
        >
          {MONTH_LABELS[m]}
        </button>
      ))}
      {showWeek && (
        <>
          <span className="ml-4 text-sm text-neutral-400">주차:</span>
          {weeks.map((w) => (
            <button
              key={w}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                week === w ? 'bg-cyan-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'
              }`}
              onClick={() => onWeekChange(w)}
            >
              {w}주차
            </button>
          ))}
        </>
      )}
    </div>
  );
}
