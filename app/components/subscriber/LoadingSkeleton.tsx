'use client';

/**
 * 구독자 IIWarmup 페이지 로딩 스켈레톤
 */
export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl space-y-8 px-5 py-10">
        <header className="text-center">
          <div className="mx-auto h-8 w-48 skeleton-shimmer rounded" />
          <div className="mx-auto mt-2 h-5 w-64 skeleton-shimmer rounded" />
          <div className="mx-auto mt-1 h-4 w-56 skeleton-shimmer rounded" />
        </header>
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur-sm">
          <div className="mb-3 h-3 w-24 skeleton-shimmer rounded-full" />
          <div className="h-6 w-full skeleton-shimmer rounded-lg" />
          <div className="mt-4 flex gap-4">
            <div className="h-4 w-20 skeleton-shimmer rounded" />
            <div className="h-4 w-32 skeleton-shimmer rounded" />
          </div>
        </section>
        <section className="flex flex-col items-center gap-3">
          <div className="h-14 w-full max-w-sm skeleton-shimmer rounded-xl" />
          <div className="flex justify-center gap-2">
            <div className="h-11 w-20 skeleton-shimmer rounded-lg" />
            <div className="h-11 w-20 skeleton-shimmer rounded-lg" />
            <div className="h-11 w-20 skeleton-shimmer rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  );
}
