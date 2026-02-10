'use client';

export interface EmptyStateProps {
  hasPreviousWeek: boolean;
  onPreviousWeek?: () => void;
  onFocusWeekSelector: () => void;
}

export function EmptyState({
  hasPreviousWeek,
  onPreviousWeek,
  onFocusWeekSelector,
}: EmptyStateProps) {
  return (
    <section
      className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 text-center"
      aria-label="프로그램 없음"
    >
      <p className="text-neutral-300">
        이번 주에 배정된 프로그램이 없어요.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {hasPreviousWeek && onPreviousWeek && (
          <button
            type="button"
            onClick={onPreviousWeek}
            className="rounded-xl border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            이전 주 보기
          </button>
        )}
        <button
          type="button"
          onClick={onFocusWeekSelector}
          className="rounded-xl bg-neutral-700 px-4 py-2 text-sm text-white hover:bg-neutral-600"
        >
          주차 선택
        </button>
      </div>
    </section>
  );
}
