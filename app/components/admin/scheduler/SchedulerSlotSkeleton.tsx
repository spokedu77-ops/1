'use client';

/**
 * 슬롯 카드 로딩 스켈레톤
 * 로딩 중에도 월 아코디언 프레임 유지
 */
export function SchedulerSlotSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-neutral-700/80 bg-neutral-800/50 p-4">
      <div className="mb-3 h-4 w-12 rounded bg-neutral-700" />
      <div className="mb-3 h-9 w-full rounded bg-neutral-700" />
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 w-20 rounded bg-neutral-700" />
        <div className="h-8 w-12 rounded bg-neutral-700" />
      </div>
    </div>
  );
}
