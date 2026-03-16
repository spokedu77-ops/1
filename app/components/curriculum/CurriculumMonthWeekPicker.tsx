'use client';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEKS = [1, 2, 3, 4] as const;

export interface CurriculumMonthWeekPickerProps {
  /** 현재 선택된 월 (1~12) */
  selectedMonth: number;
  /** 현재 선택된 주차 (1~4) */
  selectedWeek: number;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
  /** true면 선생님 모드: 월 선택 비활성, 이번 달만 표시 */
  teacherMode?: boolean;
  /** 선생님 모드일 때 기준 월 (보통 현재 달) */
  currentMonth?: number;
  className?: string;
}

export default function CurriculumMonthWeekPicker({
  selectedMonth,
  selectedWeek,
  onMonthChange,
  onWeekChange,
  teacherMode = false,
  currentMonth = new Date().getMonth() + 1,
  className = '',
}: CurriculumMonthWeekPickerProps) {
  return (
    <div className={`space-y-4 w-full ${className}`}>
      {/* 월: Teacher는 표시만, Admin은 12개월 선택 */}
      {teacherMode ? (
        <div className="flex items-center justify-center sm:justify-start gap-2 py-2">
          <span className="text-slate-500 font-bold text-sm">이번 달</span>
          <span className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-lg">
            {selectedMonth}월
          </span>
        </div>
      ) : (
        <div className="w-full grid grid-cols-12 gap-1 sm:gap-2">
          {MONTHS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMonthChange(m)}
              className={`min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl flex items-center justify-center transition-all border font-black text-xs sm:text-sm touch-manipulation
                ${selectedMonth === m
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
                }`}
            >
              {m}월
            </button>
          ))}
        </div>
      )}

      {/* 주차 1~4 */}
      <div className="w-full flex bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
        {WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onWeekChange(w)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all touch-manipulation min-h-[44px]
              ${selectedWeek === w ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {w}주차
          </button>
        ))}
      </div>
    </div>
  );
}
